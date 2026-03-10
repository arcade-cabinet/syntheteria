import {
	registerBlock,
	unregisterBlock,
	updateBlockHP,
	setShelterCheck,
	processWeatherDamage,
	getBlock,
	getAllBlocks,
	getStats,
	reset,
} from "../weatherStructureBridge";
import type { WeatherCondition } from "../weatherStructureBridge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlock(overrides: Record<string, unknown> = {}) {
	return {
		blockId: "block_1",
		position: { x: 0, y: 0, z: 0 },
		materialType: "iron",
		currentHP: 100,
		maxHP: 100,
		...overrides,
	};
}

const stormWeather: WeatherCondition = {
	type: "storm",
	cubeDamagePerSecond: 5,
	intensity: 1.0,
};

const mildWeather: WeatherCondition = {
	type: "rain",
	cubeDamagePerSecond: 1,
	intensity: 0.5,
};

const clearWeather: WeatherCondition = {
	type: "clear",
	cubeDamagePerSecond: 0,
	intensity: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("weatherStructureBridge", () => {
	beforeEach(() => {
		reset();
	});

	// -----------------------------------------------------------------------
	// Block registration
	// -----------------------------------------------------------------------

	describe("registerBlock / unregisterBlock", () => {
		it("registers a block that can be retrieved", () => {
			registerBlock(makeBlock());
			const block = getBlock("block_1");
			expect(block).not.toBeNull();
			expect(block!.materialType).toBe("iron");
			expect(block!.currentHP).toBe(100);
		});

		it("unregisters a block", () => {
			registerBlock(makeBlock());
			unregisterBlock("block_1");
			expect(getBlock("block_1")).toBeNull();
		});

		it("getAllBlocks returns all registered blocks", () => {
			registerBlock(makeBlock({ blockId: "b1" }));
			registerBlock(makeBlock({ blockId: "b2" }));
			expect(getAllBlocks()).toHaveLength(2);
		});
	});

	// -----------------------------------------------------------------------
	// updateBlockHP
	// -----------------------------------------------------------------------

	describe("updateBlockHP", () => {
		it("updates HP", () => {
			registerBlock(makeBlock({ currentHP: 50, maxHP: 100 }));
			updateBlockHP("block_1", 80);
			expect(getBlock("block_1")!.currentHP).toBe(80);
		});

		it("caps at maxHP", () => {
			registerBlock(makeBlock({ currentHP: 50, maxHP: 100 }));
			updateBlockHP("block_1", 200);
			expect(getBlock("block_1")!.currentHP).toBe(100);
		});

		it("does nothing for unknown block", () => {
			expect(() => updateBlockHP("nonexistent", 50)).not.toThrow();
		});
	});

	// -----------------------------------------------------------------------
	// Weather damage processing
	// -----------------------------------------------------------------------

	describe("processWeatherDamage", () => {
		it("applies damage to exposed blocks", () => {
			registerBlock(makeBlock({ materialType: "iron", currentHP: 100 }));
			const result = processWeatherDamage(stormWeather, 1.0);

			expect(result.totalBlocksProcessed).toBe(1);
			expect(result.exposedBlocks).toBe(1);
			expect(result.shelteredBlocks).toBe(0);
			expect(result.totalDamage).toBeGreaterThan(0);
			expect(result.events[0].wasExposed).toBe(true);
			expect(result.events[0].damageTaken).toBeGreaterThan(0);
		});

		it("material resistance reduces damage", () => {
			// Iron has 0.6 resistance, scrap_iron has 0.3
			registerBlock(makeBlock({ blockId: "iron", materialType: "iron", currentHP: 100 }));
			registerBlock(makeBlock({ blockId: "scrap", materialType: "scrap_iron", currentHP: 100 }));

			processWeatherDamage(stormWeather, 1.0);

			const ironBlock = getBlock("iron")!;
			const scrapBlock = getBlock("scrap")!;

			// Iron should take less damage (higher resistance)
			expect(ironBlock.currentHP).toBeGreaterThan(scrapBlock.currentHP);
		});

		it("rare_alloy resists most damage", () => {
			registerBlock(makeBlock({ materialType: "rare_alloy", currentHP: 100 }));
			const result = processWeatherDamage(stormWeather, 1.0);

			// 0.9 resistance: damage = 5 * 1.0 * 1.0 * (1-0.9) * (1-0) = 0.5
			expect(result.events[0].damageTaken).toBeCloseTo(0.5);
		});

		it("e_waste takes heavy damage", () => {
			registerBlock(makeBlock({ materialType: "e_waste", currentHP: 100 }));
			const result = processWeatherDamage(stormWeather, 1.0);

			// 0.1 resistance: damage = 5 * 1.0 * 1.0 * (1-0.1) * (1-0) = 4.5
			expect(result.events[0].damageTaken).toBeCloseTo(4.5);
		});

		it("clear weather deals no damage", () => {
			registerBlock(makeBlock());
			const result = processWeatherDamage(clearWeather, 1.0);

			expect(result.totalDamage).toBe(0);
			expect(result.events[0].damageTaken).toBe(0);
		});

		it("mild weather deals reduced damage", () => {
			registerBlock(makeBlock({ materialType: "iron" }));
			const stormResult = processWeatherDamage(stormWeather, 1.0);
			reset();
			registerBlock(makeBlock({ materialType: "iron" }));
			const mildResult = processWeatherDamage(mildWeather, 1.0);

			expect(mildResult.totalDamage).toBeLessThan(stormResult.totalDamage);
		});

		it("delta scales damage", () => {
			registerBlock(makeBlock({ blockId: "b1", materialType: "iron" }));
			const result1 = processWeatherDamage(stormWeather, 0.5);
			const damage1 = result1.events[0].damageTaken;

			reset();
			registerBlock(makeBlock({ blockId: "b1", materialType: "iron" }));
			const result2 = processWeatherDamage(stormWeather, 1.0);
			const damage2 = result2.events[0].damageTaken;

			expect(damage2).toBeCloseTo(damage1 * 2);
		});

		it("destroys block when HP reaches 0", () => {
			registerBlock(makeBlock({ currentHP: 1, materialType: "e_waste" }));
			const result = processWeatherDamage(stormWeather, 1.0);

			expect(result.destroyedBlocks).toContain("block_1");
			expect(result.events[0].destroyed).toBe(true);
			expect(getBlock("block_1")).toBeNull();
		});

		it("reports destroyed blocks", () => {
			registerBlock(makeBlock({ blockId: "b1", currentHP: 1, materialType: "e_waste" }));
			registerBlock(makeBlock({ blockId: "b2", currentHP: 1, materialType: "e_waste" }));
			registerBlock(makeBlock({ blockId: "b3", currentHP: 1000, materialType: "rare_alloy" }));

			const result = processWeatherDamage(stormWeather, 1.0);

			expect(result.destroyedBlocks).toHaveLength(2);
			expect(result.destroyedBlocks).toContain("b1");
			expect(result.destroyedBlocks).toContain("b2");
		});
	});

	// -----------------------------------------------------------------------
	// Shelter integration
	// -----------------------------------------------------------------------

	describe("shelter check", () => {
		it("fully sheltered blocks take no damage", () => {
			setShelterCheck(() => ({ sheltered: true, weatherDamageReduction: 1.0 }));
			registerBlock(makeBlock());

			const result = processWeatherDamage(stormWeather, 1.0);

			expect(result.shelteredBlocks).toBe(1);
			expect(result.exposedBlocks).toBe(0);
			expect(result.events[0].damageTaken).toBe(0);
			expect(result.events[0].wasExposed).toBe(false);
		});

		it("partially sheltered blocks take reduced damage", () => {
			setShelterCheck(() => ({ sheltered: true, weatherDamageReduction: 0.5 }));
			registerBlock(makeBlock({ materialType: "iron" }));
			const shelteredResult = processWeatherDamage(stormWeather, 1.0);

			reset();
			registerBlock(makeBlock({ materialType: "iron" }));
			const exposedResult = processWeatherDamage(stormWeather, 1.0);

			expect(shelteredResult.events[0].damageTaken).toBeLessThan(
				exposedResult.events[0].damageTaken,
			);
		});

		it("shelter with 0 reduction is equivalent to exposed", () => {
			setShelterCheck(() => ({ sheltered: false, weatherDamageReduction: 0 }));
			registerBlock(makeBlock({ materialType: "iron" }));
			const result = processWeatherDamage(stormWeather, 1.0);

			expect(result.exposedBlocks).toBe(1);
			expect(result.events[0].wasExposed).toBe(true);
		});
	});

	// -----------------------------------------------------------------------
	// Cumulative stats
	// -----------------------------------------------------------------------

	describe("getStats", () => {
		it("tracks total damage applied", () => {
			registerBlock(makeBlock({ materialType: "iron" }));
			processWeatherDamage(stormWeather, 1.0);
			processWeatherDamage(stormWeather, 1.0);

			const stats = getStats();
			expect(stats.totalDamageApplied).toBeGreaterThan(0);
		});

		it("tracks total blocks destroyed", () => {
			registerBlock(makeBlock({ blockId: "b1", currentHP: 1, materialType: "e_waste" }));
			processWeatherDamage(stormWeather, 1.0);

			expect(getStats().totalBlocksDestroyed).toBe(1);
		});

		it("resets stats on reset()", () => {
			registerBlock(makeBlock({ currentHP: 1, materialType: "e_waste" }));
			processWeatherDamage(stormWeather, 1.0);
			reset();

			const stats = getStats();
			expect(stats.totalDamageApplied).toBe(0);
			expect(stats.totalBlocksDestroyed).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------------

	describe("edge cases", () => {
		it("handles no registered blocks", () => {
			const result = processWeatherDamage(stormWeather, 1.0);
			expect(result.totalBlocksProcessed).toBe(0);
			expect(result.events).toEqual([]);
		});

		it("handles unknown material type with default resistance", () => {
			registerBlock(makeBlock({ materialType: "unobtainium", currentHP: 100 }));
			const result = processWeatherDamage(stormWeather, 1.0);

			// Default resistance 0.3: damage = 5 * 1.0 * 1.0 * 0.7 = 3.5
			expect(result.events[0].damageTaken).toBeCloseTo(3.5);
		});

		it("zero delta means zero damage", () => {
			registerBlock(makeBlock());
			const result = processWeatherDamage(stormWeather, 0);
			expect(result.totalDamage).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// Reset
	// -----------------------------------------------------------------------

	describe("reset", () => {
		it("clears all blocks and stats", () => {
			registerBlock(makeBlock());
			processWeatherDamage(stormWeather, 1.0);
			reset();

			expect(getAllBlocks()).toHaveLength(0);
			expect(getStats().totalDamageApplied).toBe(0);
		});
	});
});
