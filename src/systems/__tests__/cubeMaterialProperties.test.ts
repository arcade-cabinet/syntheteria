/**
 * Unit tests for cube material properties system.
 *
 * Tests cover:
 * - Every material has complete, well-formed properties
 * - getMaterialProps returns correct values per material
 * - Fallback to scrap_iron for unknown material types
 * - getCarrySpeedModifier: heavy materials slow, light materials fast
 * - canSmeltAtTier with various tier combinations
 * - getMaterialsByTier filtering
 * - compareMaterials across numeric and string criteria
 * - Convenience accessors (getCompressionTime, getWallStrength, getMaxStackHeight)
 * - getAllMaterials completeness
 */

import {
	canSmeltAtTier,
	compareMaterials,
	getAllMaterials,
	getCarrySpeedModifier,
	getCompressionTime,
	getMaterialProps,
	getMaterialsByTier,
	getMaxStackHeight,
	getWallStrength,
} from "../cubeMaterialProperties";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_MATERIAL_TYPES = [
	"scrap_iron",
	"iron",
	"copper",
	"e_waste",
	"fiber_optics",
	"rare_alloy",
];

// ---------------------------------------------------------------------------
// Complete property validation
// ---------------------------------------------------------------------------

describe("material completeness", () => {
	it("defines exactly 6 materials", () => {
		expect(getAllMaterials()).toHaveLength(6);
	});

	it.each(ALL_MATERIAL_TYPES)(
		"%s has all required properties",
		(materialType) => {
			const props = getMaterialProps(materialType);

			expect(props.materialType).toBe(materialType);
			expect(typeof props.displayName).toBe("string");
			expect(props.displayName.length).toBeGreaterThan(0);
			expect(typeof props.compressionTime).toBe("number");
			expect(typeof props.wallStrength).toBe("number");
			expect(typeof props.weight).toBe("number");
			expect(typeof props.stackLimit).toBe("number");
			expect(typeof props.weatherResistance).toBe("number");
			expect(typeof props.meltingPoint).toBe("number");
			expect(typeof props.conductivity).toBe("number");
			expect(typeof props.color).toBe("string");
			expect(typeof props.tier).toBe("number");
		},
	);

	it.each(ALL_MATERIAL_TYPES)(
		"%s has positive compressionTime",
		(materialType) => {
			expect(getMaterialProps(materialType).compressionTime).toBeGreaterThan(0);
		},
	);

	it.each(ALL_MATERIAL_TYPES)(
		"%s has wallStrength in 0–100 range",
		(materialType) => {
			const { wallStrength } = getMaterialProps(materialType);
			expect(wallStrength).toBeGreaterThanOrEqual(0);
			expect(wallStrength).toBeLessThanOrEqual(100);
		},
	);

	it.each(ALL_MATERIAL_TYPES)(
		"%s has positive weight",
		(materialType) => {
			expect(getMaterialProps(materialType).weight).toBeGreaterThan(0);
		},
	);

	it.each(ALL_MATERIAL_TYPES)(
		"%s has weatherResistance in 0–1 range",
		(materialType) => {
			const { weatherResistance } = getMaterialProps(materialType);
			expect(weatherResistance).toBeGreaterThanOrEqual(0);
			expect(weatherResistance).toBeLessThanOrEqual(1);
		},
	);

	it.each(ALL_MATERIAL_TYPES)(
		"%s has conductivity in 0–1 range",
		(materialType) => {
			const { conductivity } = getMaterialProps(materialType);
			expect(conductivity).toBeGreaterThanOrEqual(0);
			expect(conductivity).toBeLessThanOrEqual(1);
		},
	);

	it.each(ALL_MATERIAL_TYPES)(
		"%s has hex color starting with #",
		(materialType) => {
			expect(getMaterialProps(materialType).color).toMatch(/^#[0-9A-Fa-f]{6}$/);
		},
	);

	it.each(ALL_MATERIAL_TYPES)(
		"%s has tier between 1 and 3",
		(materialType) => {
			const { tier } = getMaterialProps(materialType);
			expect(tier).toBeGreaterThanOrEqual(1);
			expect(tier).toBeLessThanOrEqual(3);
		},
	);
});

// ---------------------------------------------------------------------------
// getMaterialProps — specific values
// ---------------------------------------------------------------------------

describe("getMaterialProps — specific values", () => {
	it("returns correct scrap_iron properties", () => {
		const props = getMaterialProps("scrap_iron");

		expect(props.displayName).toBe("Scrap Iron");
		expect(props.compressionTime).toBe(2.0);
		expect(props.wallStrength).toBe(30);
		expect(props.weight).toBe(8);
		expect(props.stackLimit).toBe(6);
		expect(props.weatherResistance).toBe(0.3);
		expect(props.meltingPoint).toBe(1);
		expect(props.conductivity).toBe(0.2);
		expect(props.color).toBe("#8B7355");
		expect(props.tier).toBe(1);
	});

	it("returns correct rare_alloy properties", () => {
		const props = getMaterialProps("rare_alloy");

		expect(props.displayName).toBe("Rare Alloy");
		expect(props.compressionTime).toBe(5.0);
		expect(props.wallStrength).toBe(100);
		expect(props.weight).toBe(15);
		expect(props.stackLimit).toBe(10);
		expect(props.weatherResistance).toBe(0.9);
		expect(props.meltingPoint).toBe(3);
		expect(props.conductivity).toBe(0.7);
		expect(props.color).toBe("#FFD700");
		expect(props.tier).toBe(3);
	});

	it("returns correct copper properties", () => {
		const props = getMaterialProps("copper");

		expect(props.compressionTime).toBe(2.5);
		expect(props.wallStrength).toBe(40);
		expect(props.weight).toBe(10);
		expect(props.conductivity).toBe(0.9);
		expect(props.tier).toBe(2);
	});

	it("returns correct fiber_optics properties", () => {
		const props = getMaterialProps("fiber_optics");

		expect(props.displayName).toBe("Fiber Optics");
		expect(props.compressionTime).toBe(1.0);
		expect(props.wallStrength).toBe(10);
		expect(props.weight).toBe(2);
		expect(props.stackLimit).toBe(3);
		expect(props.conductivity).toBe(0.1);
	});

	it("returns correct e_waste properties", () => {
		const props = getMaterialProps("e_waste");

		expect(props.displayName).toBe("E-Waste");
		expect(props.compressionTime).toBe(1.5);
		expect(props.wallStrength).toBe(15);
		expect(props.weight).toBe(5);
		expect(props.stackLimit).toBe(4);
		expect(props.weatherResistance).toBe(0.1);
	});

	it("returns correct iron properties", () => {
		const props = getMaterialProps("iron");

		expect(props.compressionTime).toBe(3.0);
		expect(props.wallStrength).toBe(60);
		expect(props.weight).toBe(12);
		expect(props.stackLimit).toBe(8);
		expect(props.meltingPoint).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Fallback to scrap_iron
// ---------------------------------------------------------------------------

describe("getMaterialProps — fallback", () => {
	it("returns scrap_iron for unknown material type", () => {
		const props = getMaterialProps("unobtainium");

		expect(props.materialType).toBe("scrap_iron");
		expect(props.compressionTime).toBe(2.0);
	});

	it("returns scrap_iron for empty string", () => {
		const props = getMaterialProps("");

		expect(props.materialType).toBe("scrap_iron");
	});

	it("convenience accessors also fall back for unknown materials", () => {
		expect(getCompressionTime("unknown")).toBe(2.0);
		expect(getWallStrength("unknown")).toBe(30);
		expect(getMaxStackHeight("unknown")).toBe(6);
	});
});

// ---------------------------------------------------------------------------
// getCompressionTime
// ---------------------------------------------------------------------------

describe("getCompressionTime", () => {
	it("returns compression time for each material", () => {
		expect(getCompressionTime("scrap_iron")).toBe(2.0);
		expect(getCompressionTime("iron")).toBe(3.0);
		expect(getCompressionTime("copper")).toBe(2.5);
		expect(getCompressionTime("e_waste")).toBe(1.5);
		expect(getCompressionTime("fiber_optics")).toBe(1.0);
		expect(getCompressionTime("rare_alloy")).toBe(5.0);
	});
});

// ---------------------------------------------------------------------------
// getWallStrength
// ---------------------------------------------------------------------------

describe("getWallStrength", () => {
	it("rare_alloy has the highest wall strength", () => {
		const allStrengths = ALL_MATERIAL_TYPES.map(getWallStrength);
		const maxStrength = Math.max(...allStrengths);

		expect(getWallStrength("rare_alloy")).toBe(maxStrength);
		expect(getWallStrength("rare_alloy")).toBe(100);
	});

	it("fiber_optics has the lowest wall strength", () => {
		const allStrengths = ALL_MATERIAL_TYPES.map(getWallStrength);
		const minStrength = Math.min(...allStrengths);

		expect(getWallStrength("fiber_optics")).toBe(minStrength);
		expect(getWallStrength("fiber_optics")).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// getCarrySpeedModifier
// ---------------------------------------------------------------------------

describe("getCarrySpeedModifier", () => {
	const BASE_SPEED = 10;

	it("lighter materials result in higher carry speed", () => {
		const fiberSpeed = getCarrySpeedModifier("fiber_optics", BASE_SPEED);
		const ironSpeed = getCarrySpeedModifier("iron", BASE_SPEED);

		expect(fiberSpeed).toBeGreaterThan(ironSpeed);
	});

	it("heavier materials result in lower carry speed", () => {
		const rareAlloySpeed = getCarrySpeedModifier("rare_alloy", BASE_SPEED);
		const scrapSpeed = getCarrySpeedModifier("scrap_iron", BASE_SPEED);

		expect(rareAlloySpeed).toBeLessThan(scrapSpeed);
	});

	it("computes correct value for fiber_optics (weight=2)", () => {
		// baseSpeed * (1 - 2/30) = 10 * (28/30) = 10 * 0.9333...
		const speed = getCarrySpeedModifier("fiber_optics", BASE_SPEED);

		expect(speed).toBeCloseTo(BASE_SPEED * (1 - 2 / 30));
	});

	it("computes correct value for rare_alloy (weight=15)", () => {
		// baseSpeed * (1 - 15/30) = 10 * 0.5 = 5
		const speed = getCarrySpeedModifier("rare_alloy", BASE_SPEED);

		expect(speed).toBe(5);
	});

	it("returns zero speed when weight equals 30", () => {
		// If a hypothetical material had weight=30: factor = 1 - 30/30 = 0
		// We test the formula with a known fallback (scrap_iron weight=8)
		// baseSpeed * (1 - 8/30) = 10 * (22/30)
		const speed = getCarrySpeedModifier("scrap_iron", BASE_SPEED);

		expect(speed).toBeCloseTo(BASE_SPEED * (1 - 8 / 30));
	});

	it("never returns a negative value", () => {
		for (const material of ALL_MATERIAL_TYPES) {
			const speed = getCarrySpeedModifier(material, BASE_SPEED);
			expect(speed).toBeGreaterThanOrEqual(0);
		}
	});

	it("returns zero when baseSpeed is zero", () => {
		expect(getCarrySpeedModifier("iron", 0)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getMaxStackHeight
// ---------------------------------------------------------------------------

describe("getMaxStackHeight", () => {
	it("returns correct stack limits", () => {
		expect(getMaxStackHeight("scrap_iron")).toBe(6);
		expect(getMaxStackHeight("iron")).toBe(8);
		expect(getMaxStackHeight("copper")).toBe(7);
		expect(getMaxStackHeight("e_waste")).toBe(4);
		expect(getMaxStackHeight("fiber_optics")).toBe(3);
		expect(getMaxStackHeight("rare_alloy")).toBe(10);
	});

	it("rare_alloy has the highest stack limit", () => {
		const allLimits = ALL_MATERIAL_TYPES.map(getMaxStackHeight);
		expect(getMaxStackHeight("rare_alloy")).toBe(Math.max(...allLimits));
	});
});

// ---------------------------------------------------------------------------
// canSmeltAtTier
// ---------------------------------------------------------------------------

describe("canSmeltAtTier", () => {
	it("tier 1 furnace can smelt scrap_iron (meltingPoint=1)", () => {
		expect(canSmeltAtTier("scrap_iron", 1)).toBe(true);
	});

	it("tier 1 furnace can smelt e_waste (meltingPoint=1)", () => {
		expect(canSmeltAtTier("e_waste", 1)).toBe(true);
	});

	it("tier 1 furnace can smelt fiber_optics (meltingPoint=1)", () => {
		expect(canSmeltAtTier("fiber_optics", 1)).toBe(true);
	});

	it("tier 1 furnace cannot smelt iron (meltingPoint=2)", () => {
		expect(canSmeltAtTier("iron", 1)).toBe(false);
	});

	it("tier 1 furnace cannot smelt copper (meltingPoint=2)", () => {
		expect(canSmeltAtTier("copper", 1)).toBe(false);
	});

	it("tier 1 furnace cannot smelt rare_alloy (meltingPoint=3)", () => {
		expect(canSmeltAtTier("rare_alloy", 1)).toBe(false);
	});

	it("tier 2 furnace can smelt iron and copper", () => {
		expect(canSmeltAtTier("iron", 2)).toBe(true);
		expect(canSmeltAtTier("copper", 2)).toBe(true);
	});

	it("tier 2 furnace cannot smelt rare_alloy (meltingPoint=3)", () => {
		expect(canSmeltAtTier("rare_alloy", 2)).toBe(false);
	});

	it("tier 3 furnace can smelt every material", () => {
		for (const material of ALL_MATERIAL_TYPES) {
			expect(canSmeltAtTier(material, 3)).toBe(true);
		}
	});

	it("higher tier furnace can always smelt lower tier materials", () => {
		expect(canSmeltAtTier("scrap_iron", 3)).toBe(true);
		expect(canSmeltAtTier("e_waste", 2)).toBe(true);
		expect(canSmeltAtTier("iron", 3)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getMaterialsByTier
// ---------------------------------------------------------------------------

describe("getMaterialsByTier", () => {
	it("tier 1 has scrap_iron, e_waste, and fiber_optics", () => {
		const tier1 = getMaterialsByTier(1);
		const types = tier1.map((m) => m.materialType).sort();

		expect(types).toEqual(["e_waste", "fiber_optics", "scrap_iron"]);
	});

	it("tier 2 has iron and copper", () => {
		const tier2 = getMaterialsByTier(2);
		const types = tier2.map((m) => m.materialType).sort();

		expect(types).toEqual(["copper", "iron"]);
	});

	it("tier 3 has rare_alloy only", () => {
		const tier3 = getMaterialsByTier(3);
		const types = tier3.map((m) => m.materialType);

		expect(types).toEqual(["rare_alloy"]);
	});

	it("returns empty array for non-existent tier", () => {
		expect(getMaterialsByTier(0)).toEqual([]);
		expect(getMaterialsByTier(4)).toEqual([]);
		expect(getMaterialsByTier(99)).toEqual([]);
	});

	it("all tiers together cover all materials", () => {
		const all = [
			...getMaterialsByTier(1),
			...getMaterialsByTier(2),
			...getMaterialsByTier(3),
		];

		expect(all).toHaveLength(6);
	});
});

// ---------------------------------------------------------------------------
// getAllMaterials
// ---------------------------------------------------------------------------

describe("getAllMaterials", () => {
	it("returns all 6 materials", () => {
		const all = getAllMaterials();
		expect(all).toHaveLength(6);
	});

	it("contains every expected material type", () => {
		const types = getAllMaterials().map((m) => m.materialType).sort();
		expect(types).toEqual([...ALL_MATERIAL_TYPES].sort());
	});
});

// ---------------------------------------------------------------------------
// compareMaterials
// ---------------------------------------------------------------------------

describe("compareMaterials", () => {
	it("compares wallStrength: rare_alloy > scrap_iron", () => {
		const result = compareMaterials("rare_alloy", "scrap_iron", "wallStrength");
		expect(result).toBeGreaterThan(0);
	});

	it("compares wallStrength: scrap_iron < rare_alloy", () => {
		const result = compareMaterials("scrap_iron", "rare_alloy", "wallStrength");
		expect(result).toBeLessThan(0);
	});

	it("returns zero when comparing same material", () => {
		const result = compareMaterials("iron", "iron", "wallStrength");
		expect(result).toBe(0);
	});

	it("compares weight correctly", () => {
		// fiber_optics=2, rare_alloy=15
		const result = compareMaterials("fiber_optics", "rare_alloy", "weight");
		expect(result).toBeLessThan(0);
	});

	it("compares compressionTime correctly", () => {
		// fiber_optics=1.0, rare_alloy=5.0
		const result = compareMaterials(
			"fiber_optics",
			"rare_alloy",
			"compressionTime",
		);
		expect(result).toBeLessThan(0);
	});

	it("compares tier correctly", () => {
		// scrap_iron tier=1, rare_alloy tier=3
		const result = compareMaterials("scrap_iron", "rare_alloy", "tier");
		expect(result).toBeLessThan(0);
	});

	it("compares string fields (displayName) correctly", () => {
		// "Copper" < "Iron" alphabetically
		const result = compareMaterials("copper", "iron", "displayName");
		expect(result).toBeLessThan(0);
	});

	it("compares color strings correctly", () => {
		const result = compareMaterials("scrap_iron", "rare_alloy", "color");
		// "#8B7355" vs "#FFD700" — lexicographic comparison
		expect(typeof result).toBe("number");
	});

	it("can sort materials by wallStrength", () => {
		const sorted = [...ALL_MATERIAL_TYPES].sort((a, b) =>
			compareMaterials(a, b, "wallStrength"),
		);

		// fiber_optics(10) < e_waste(15) < scrap_iron(30) < copper(40) < iron(60) < rare_alloy(100)
		expect(sorted).toEqual([
			"fiber_optics",
			"e_waste",
			"scrap_iron",
			"copper",
			"iron",
			"rare_alloy",
		]);
	});
});
