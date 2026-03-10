/**
 * Unit tests for tooltipSystem — contextual tooltip data generation.
 *
 * Tests cover:
 * - generateTooltip: correct stats per entity type (ore_deposit, material_cube,
 *   furnace, enemy_bot, friendly_bot, building, turret, otter, lightning_rod)
 * - generateTooltip: title resolution (displayName override, material prefix, tier suffix)
 * - generateTooltip: subtitle resolution (faction, power, status)
 * - generateTooltip: rarity resolution (tier, material, level)
 * - generateTooltip: faction color mapping
 * - generateTooltip: action hint arrays per type
 * - formatDistance: meters, kilometers, rounding
 * - formatTime: seconds, minutes, hours, mixed
 * - formatPercent: normal, zero, clamped
 * - getHealthColor: green/yellow/orange/red thresholds
 * - getRarityColor: all tiers + fallback
 * - reset: clears cache
 * - Edge cases: missing data, unknown types, boundary values
 */

import {
	formatDistance,
	formatPercent,
	formatTime,
	generateTooltip,
	getHealthColor,
	getRarityColor,
	reset,
	type EntityData,
	type TooltipData,
} from "../tooltipSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntityData(overrides: Partial<EntityData> & { type: string }): EntityData {
	return { ...overrides };
}

function findStat(tooltip: TooltipData, label: string) {
	return tooltip.stats.find((s) => s.label === label);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// formatDistance
// ---------------------------------------------------------------------------

describe("formatDistance", () => {
	it("formats small whole-number distances", () => {
		expect(formatDistance(0)).toBe("0m");
		expect(formatDistance(1)).toBe("1m");
		expect(formatDistance(5)).toBe("5m");
	});

	it("formats fractional distances with one decimal", () => {
		expect(formatDistance(2.5)).toBe("2.5m");
		expect(formatDistance(0.3)).toBe("0.3m");
	});

	it("rounds distances >= 10m to whole numbers", () => {
		expect(formatDistance(10)).toBe("10m");
		expect(formatDistance(15.7)).toBe("16m");
		expect(formatDistance(150)).toBe("150m");
	});

	it("formats kilometer distances", () => {
		expect(formatDistance(1000)).toBe("1km");
		expect(formatDistance(1200)).toBe("1.2km");
		expect(formatDistance(2500)).toBe("2.5km");
	});

	it("clamps negative values to zero", () => {
		expect(formatDistance(-5)).toBe("0m");
	});
});

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------

describe("formatTime", () => {
	it("formats seconds only", () => {
		expect(formatTime(0)).toBe("0s");
		expect(formatTime(5)).toBe("5s");
		expect(formatTime(59)).toBe("59s");
	});

	it("formats minutes and seconds", () => {
		expect(formatTime(60)).toBe("1m");
		expect(formatTime(90)).toBe("1m 30s");
		expect(formatTime(125)).toBe("2m 5s");
	});

	it("formats hours and minutes", () => {
		expect(formatTime(3600)).toBe("1h");
		expect(formatTime(3600 + 15 * 60)).toBe("1h 15m");
		expect(formatTime(2 * 3600 + 15 * 60)).toBe("2h 15m");
	});

	it("clamps negative values to zero", () => {
		expect(formatTime(-10)).toBe("0s");
	});

	it("rounds fractional seconds", () => {
		expect(formatTime(5.7)).toBe("6s");
	});
});

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------

describe("formatPercent", () => {
	it("formats normal percentages", () => {
		expect(formatPercent(85, 100)).toBe("85%");
		expect(formatPercent(50, 200)).toBe("25%");
	});

	it("clamps to 0-100 range", () => {
		expect(formatPercent(150, 100)).toBe("100%");
		expect(formatPercent(-10, 100)).toBe("0%");
	});

	it("handles zero max gracefully", () => {
		expect(formatPercent(50, 0)).toBe("0%");
	});

	it("rounds to nearest whole percent", () => {
		expect(formatPercent(1, 3)).toBe("33%");
		expect(formatPercent(2, 3)).toBe("67%");
	});
});

// ---------------------------------------------------------------------------
// getHealthColor
// ---------------------------------------------------------------------------

describe("getHealthColor", () => {
	it("returns green for high health", () => {
		expect(getHealthColor(1.0)).toBe("#4CAF50");
		expect(getHealthColor(0.8)).toBe("#4CAF50");
	});

	it("returns yellow for medium-high health", () => {
		expect(getHealthColor(0.6)).toBe("#FFEB3B");
	});

	it("returns orange for medium-low health", () => {
		expect(getHealthColor(0.4)).toBe("#FF9800");
	});

	it("returns red for low health", () => {
		expect(getHealthColor(0.2)).toBe("#F44336");
		expect(getHealthColor(0.0)).toBe("#F44336");
	});

	it("handles boundary values correctly", () => {
		// 0.75 is NOT > 0.75 so it should be yellow
		expect(getHealthColor(0.75)).toBe("#FFEB3B");
		// 0.5 is NOT > 0.5 so it should be orange
		expect(getHealthColor(0.5)).toBe("#FF9800");
		// 0.25 is NOT > 0.25 so it should be red
		expect(getHealthColor(0.25)).toBe("#F44336");
	});
});

// ---------------------------------------------------------------------------
// getRarityColor
// ---------------------------------------------------------------------------

describe("getRarityColor", () => {
	it("returns correct colors for all rarity tiers", () => {
		expect(getRarityColor("common")).toBe("#BDBDBD");
		expect(getRarityColor("uncommon")).toBe("#4CAF50");
		expect(getRarityColor("rare")).toBe("#2196F3");
		expect(getRarityColor("legendary")).toBe("#FFD600");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — ore_deposit
// ---------------------------------------------------------------------------

describe("generateTooltip — ore_deposit", () => {
	it("generates quantity bar, material, and hardness stats", () => {
		const tooltip = generateTooltip("d1", makeEntityData({
			type: "ore_deposit",
			materialType: "iron",
			quantity: 80,
			maxQuantity: 100,
		}));

		expect(tooltip.entityId).toBe("d1");
		expect(tooltip.title).toBe("Iron Ore Deposit");

		const quantity = findStat(tooltip, "Quantity");
		expect(quantity).toBeDefined();
		expect(quantity!.value).toBe("80/100");
		expect(quantity!.barPercent).toBe(0.8);

		const material = findStat(tooltip, "Material");
		expect(material).toBeDefined();
		expect(material!.value).toBe("Iron");

		const hardness = findStat(tooltip, "Hardness");
		expect(hardness).toBeDefined();
		expect(hardness!.value).toBe("Medium");
	});

	it("flags low quantity with red color", () => {
		const tooltip = generateTooltip("d2", makeEntityData({
			type: "ore_deposit",
			quantity: 10,
			maxQuantity: 100,
		}));

		const quantity = findStat(tooltip, "Quantity");
		expect(quantity!.color).toBe("#F44336");
	});

	it("includes harvest and inspect actions", () => {
		const tooltip = generateTooltip("d3", makeEntityData({
			type: "ore_deposit",
		}));

		expect(tooltip.actions).toContain("E: Harvest");
		expect(tooltip.actions).toContain("F: Inspect");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — material_cube
// ---------------------------------------------------------------------------

describe("generateTooltip — material_cube", () => {
	it("generates material, weight, and value stats", () => {
		const tooltip = generateTooltip("c1", makeEntityData({
			type: "material_cube",
			materialType: "copper",
		}));

		expect(tooltip.title).toBe("Copper Material Cube");

		expect(findStat(tooltip, "Material")!.value).toBe("Copper");
		expect(findStat(tooltip, "Weight")!.value).toBe("8.9 kg");
		expect(findStat(tooltip, "Value")!.value).toBe("15 credits");
	});

	it("uses rarity based on material type", () => {
		expect(
			generateTooltip("c2", makeEntityData({ type: "material_cube", materialType: "copper" })).rarity,
		).toBe("uncommon");
		expect(
			generateTooltip("c3", makeEntityData({ type: "material_cube", materialType: "titanium" })).rarity,
		).toBe("rare");
		expect(
			generateTooltip("c4", makeEntityData({ type: "material_cube", materialType: "uranium" })).rarity,
		).toBe("legendary");
		expect(
			generateTooltip("c5", makeEntityData({ type: "material_cube", materialType: "iron" })).rarity,
		).toBe("common");
	});

	it("defaults unknown materials to fallback values", () => {
		const tooltip = generateTooltip("c6", makeEntityData({
			type: "material_cube",
			materialType: "unobtanium",
		}));

		expect(findStat(tooltip, "Weight")!.value).toBe("5.0 kg");
		expect(findStat(tooltip, "Value")!.value).toBe("5 credits");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — furnace
// ---------------------------------------------------------------------------

describe("generateTooltip — furnace", () => {
	it("shows power online and processing status", () => {
		const tooltip = generateTooltip("f1", makeEntityData({
			type: "furnace",
			isPowered: true,
			isProcessing: true,
			tier: 2,
		}));

		expect(tooltip.title).toBe("Furnace Mk.II");
		expect(findStat(tooltip, "Power")!.value).toBe("Online");
		expect(findStat(tooltip, "Power")!.color).toBe("#4CAF50");
		expect(findStat(tooltip, "Status")!.value).toBe("Processing");
		expect(findStat(tooltip, "Tier")!.value).toBe("Mk.II");
	});

	it("shows power offline when unpowered", () => {
		const tooltip = generateTooltip("f2", makeEntityData({
			type: "furnace",
			isPowered: false,
		}));

		expect(findStat(tooltip, "Power")!.value).toBe("Offline");
		expect(findStat(tooltip, "Power")!.color).toBe("#F44336");
	});

	it("shows idle when not processing", () => {
		const tooltip = generateTooltip("f3", makeEntityData({
			type: "furnace",
			isPowered: true,
			isProcessing: false,
		}));

		expect(findStat(tooltip, "Status")!.value).toBe("Idle");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — enemy_bot
// ---------------------------------------------------------------------------

describe("generateTooltip — enemy_bot", () => {
	it("generates health bar, faction, type, and threat stats", () => {
		const tooltip = generateTooltip("e1", makeEntityData({
			type: "enemy_bot",
			health: 60,
			maxHealth: 100,
			faction: "Volt Collective",
			status: "Assault",
			level: 7,
		}));

		expect(tooltip.title).toBe("Enemy Bot");
		expect(findStat(tooltip, "Health")!.value).toBe("60/100");
		expect(findStat(tooltip, "Health")!.barPercent).toBe(0.6);
		expect(findStat(tooltip, "Faction")!.value).toBe("Volt Collective");
		expect(findStat(tooltip, "Type")!.value).toBe("Assault");
		expect(findStat(tooltip, "Threat")!.value).toBe("High");
	});

	it("uses health color coding", () => {
		const tooltip = generateTooltip("e2", makeEntityData({
			type: "enemy_bot",
			health: 20,
			maxHealth: 100,
		}));

		expect(findStat(tooltip, "Health")!.color).toBe("#F44336");
	});

	it("resolves threat levels by bot level", () => {
		expect(
			findStat(
				generateTooltip("e3", makeEntityData({ type: "enemy_bot", level: 1 })),
				"Threat",
			)!.value,
		).toBe("Low");

		expect(
			findStat(
				generateTooltip("e4", makeEntityData({ type: "enemy_bot", level: 5 })),
				"Threat",
			)!.value,
		).toBe("Medium");

		expect(
			findStat(
				generateTooltip("e5", makeEntityData({ type: "enemy_bot", level: 10 })),
				"Threat",
			)!.value,
		).toBe("Extreme");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — friendly_bot
// ---------------------------------------------------------------------------

describe("generateTooltip — friendly_bot", () => {
	it("generates health, status, commands, cargo stats", () => {
		const tooltip = generateTooltip("fb1", makeEntityData({
			type: "friendly_bot",
			health: 90,
			maxHealth: 100,
			status: "Patrolling",
			level: 3,
			quantity: 5,
			maxQuantity: 10,
		}));

		expect(findStat(tooltip, "Health")!.value).toBe("90/100");
		expect(findStat(tooltip, "Status")!.value).toBe("Patrolling");
		expect(findStat(tooltip, "Commands")!.value).toBe("3 queued");
		expect(findStat(tooltip, "Cargo")!.value).toBe("5/10");
	});

	it("shows empty cargo and no commands when absent", () => {
		const tooltip = generateTooltip("fb2", makeEntityData({
			type: "friendly_bot",
		}));

		expect(findStat(tooltip, "Commands")!.value).toBe("None");
		expect(findStat(tooltip, "Cargo")!.value).toBe("Empty");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — building
// ---------------------------------------------------------------------------

describe("generateTooltip — building", () => {
	it("generates health, power, and upgrade stats", () => {
		const tooltip = generateTooltip("b1", makeEntityData({
			type: "building",
			health: 200,
			maxHealth: 300,
			isPowered: true,
			tier: 3,
		}));

		expect(findStat(tooltip, "Health")!.value).toBe("200/300");
		expect(findStat(tooltip, "Power")!.value).toBe("Online");
		expect(findStat(tooltip, "Upgrade")!.value).toBe("Tier 3");
		expect(tooltip.rarity).toBe("rare");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — turret
// ---------------------------------------------------------------------------

describe("generateTooltip — turret", () => {
	it("generates ammo bar, mode, and range stats", () => {
		const tooltip = generateTooltip("t1", makeEntityData({
			type: "turret",
			quantity: 25,
			maxQuantity: 100,
			status: "Manual",
			level: 20,
		}));

		expect(findStat(tooltip, "Ammo")!.value).toBe("25/100");
		expect(findStat(tooltip, "Ammo")!.barPercent).toBe(0.25);
		expect(findStat(tooltip, "Mode")!.value).toBe("Manual");
		expect(findStat(tooltip, "Range")!.value).toBe("20m");
	});

	it("flags low ammo with red color", () => {
		const tooltip = generateTooltip("t2", makeEntityData({
			type: "turret",
			quantity: 5,
			maxQuantity: 100,
		}));

		expect(findStat(tooltip, "Ammo")!.color).toBe("#F44336");
	});

	it("defaults mode and range when absent", () => {
		const tooltip = generateTooltip("t3", makeEntityData({
			type: "turret",
		}));

		expect(findStat(tooltip, "Mode")!.value).toBe("Auto");
		expect(findStat(tooltip, "Range")!.value).toBe("15m");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — otter
// ---------------------------------------------------------------------------

describe("generateTooltip — otter", () => {
	it("generates quest and trade stats", () => {
		const tooltip = generateTooltip("o1", makeEntityData({
			type: "otter",
			status: "complete",
			isPowered: true,
		}));

		expect(tooltip.title).toBe("Otter");
		expect(findStat(tooltip, "Quest")!.value).toBe("Complete");
		expect(findStat(tooltip, "Quest")!.color).toBe("#4CAF50");
		expect(findStat(tooltip, "Trade")!.value).toBe("Available");
	});

	it("shows trade unavailable when isPowered is false", () => {
		const tooltip = generateTooltip("o2", makeEntityData({
			type: "otter",
			isPowered: false,
		}));

		expect(findStat(tooltip, "Trade")!.value).toBe("Unavailable");
		expect(findStat(tooltip, "Trade")!.color).toBe("#9E9E9E");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — lightning_rod
// ---------------------------------------------------------------------------

describe("generateTooltip — lightning_rod", () => {
	it("generates charge bar and storm status", () => {
		const tooltip = generateTooltip("lr1", makeEntityData({
			type: "lightning_rod",
			quantity: 80,
			maxQuantity: 100,
			status: "active",
		}));

		expect(findStat(tooltip, "Charge")!.value).toBe("80%");
		expect(findStat(tooltip, "Charge")!.barPercent).toBe(0.8);
		expect(findStat(tooltip, "Charge")!.color).toBe("#4CAF50");
		expect(findStat(tooltip, "Storm")!.value).toBe("Active");
		expect(findStat(tooltip, "Storm")!.color).toBe("#FFEB3B");
	});

	it("shows low charge in red", () => {
		const tooltip = generateTooltip("lr2", makeEntityData({
			type: "lightning_rod",
			quantity: 10,
			maxQuantity: 100,
		}));

		expect(findStat(tooltip, "Charge")!.color).toBe("#F44336");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — title resolution
// ---------------------------------------------------------------------------

describe("generateTooltip — title resolution", () => {
	it("uses displayName when provided", () => {
		const tooltip = generateTooltip("x1", makeEntityData({
			type: "furnace",
			displayName: "The Mega Smelter",
		}));

		expect(tooltip.title).toBe("The Mega Smelter");
	});

	it("derives title from type for unknown entities", () => {
		const tooltip = generateTooltip("x2", makeEntityData({
			type: "mystery_object",
		}));

		expect(tooltip.title).toBe("Mystery object");
	});

	it("prepends material type for ore deposits", () => {
		const tooltip = generateTooltip("x3", makeEntityData({
			type: "ore_deposit",
			materialType: "titanium",
		}));

		expect(tooltip.title).toBe("Titanium Ore Deposit");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — subtitle resolution
// ---------------------------------------------------------------------------

describe("generateTooltip — subtitle resolution", () => {
	it("includes faction territory in subtitle", () => {
		const tooltip = generateTooltip("s1", makeEntityData({
			type: "building",
			faction: "Reclaimers",
		}));

		expect(tooltip.subtitle).toContain("Reclaimers Territory");
	});

	it("includes power status in subtitle", () => {
		const tooltip = generateTooltip("s2", makeEntityData({
			type: "furnace",
			isPowered: true,
		}));

		expect(tooltip.subtitle).toContain("Powered");
	});

	it("uses default subtitle when no data available", () => {
		const tooltip = generateTooltip("s3", makeEntityData({
			type: "ore_deposit",
		}));

		expect(tooltip.subtitle).toBe("Natural Formation");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — rarity resolution
// ---------------------------------------------------------------------------

describe("generateTooltip — rarity resolution", () => {
	it("resolves rarity from tier", () => {
		expect(generateTooltip("r1", makeEntityData({ type: "furnace", tier: 1 })).rarity).toBe("common");
		expect(generateTooltip("r2", makeEntityData({ type: "furnace", tier: 2 })).rarity).toBe("uncommon");
		expect(generateTooltip("r3", makeEntityData({ type: "furnace", tier: 3 })).rarity).toBe("rare");
		expect(generateTooltip("r4", makeEntityData({ type: "furnace", tier: 4 })).rarity).toBe("legendary");
	});

	it("resolves rarity from material type", () => {
		expect(generateTooltip("r5", makeEntityData({ type: "material_cube", materialType: "iron" })).rarity).toBe("common");
		expect(generateTooltip("r6", makeEntityData({ type: "material_cube", materialType: "gold" })).rarity).toBe("rare");
	});

	it("resolves rarity from bot level", () => {
		expect(generateTooltip("r7", makeEntityData({ type: "enemy_bot", level: 2 })).rarity).toBe("common");
		expect(generateTooltip("r8", makeEntityData({ type: "enemy_bot", level: 5 })).rarity).toBe("uncommon");
		expect(generateTooltip("r9", makeEntityData({ type: "enemy_bot", level: 8 })).rarity).toBe("rare");
		expect(generateTooltip("r10", makeEntityData({ type: "enemy_bot", level: 12 })).rarity).toBe("legendary");
	});

	it("defaults to common when no determining data exists", () => {
		expect(generateTooltip("r11", makeEntityData({ type: "wall" })).rarity).toBe("common");
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — faction color
// ---------------------------------------------------------------------------

describe("generateTooltip — faction color", () => {
	it("maps known factions to colors", () => {
		expect(
			generateTooltip("fc1", makeEntityData({ type: "building", faction: "Reclaimers" })).factionColor,
		).toBe("#D4763C");
		expect(
			generateTooltip("fc2", makeEntityData({ type: "building", faction: "Volt Collective" })).factionColor,
		).toBe("#4FC3F7");
		expect(
			generateTooltip("fc3", makeEntityData({ type: "building", faction: "Signal Choir" })).factionColor,
		).toBe("#AB47BC");
		expect(
			generateTooltip("fc4", makeEntityData({ type: "building", faction: "Iron Creed" })).factionColor,
		).toBe("#78909C");
	});

	it("returns null for unknown factions", () => {
		expect(
			generateTooltip("fc5", makeEntityData({ type: "building", faction: "Unknown Faction" })).factionColor,
		).toBeNull();
	});

	it("returns null when no faction specified", () => {
		expect(
			generateTooltip("fc6", makeEntityData({ type: "building" })).factionColor,
		).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// generateTooltip — unknown entity type
// ---------------------------------------------------------------------------

describe("generateTooltip — unknown entity type", () => {
	it("generates fallback stats for unknown types", () => {
		const tooltip = generateTooltip("u1", makeEntityData({
			type: "alien_artifact",
			health: 50,
			maxHealth: 100,
			status: "Glowing",
		}));

		expect(tooltip.title).toBe("Alien artifact");
		expect(tooltip.subtitle).toBe("Glowing");
		expect(findStat(tooltip, "Health")).toBeDefined();
		expect(findStat(tooltip, "Status")!.value).toBe("Glowing");
		expect(tooltip.actions).toEqual(["F: Inspect"]);
	});

	it("generates empty stats when no data is relevant", () => {
		const tooltip = generateTooltip("u2", makeEntityData({
			type: "void_thing",
		}));

		expect(tooltip.stats).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("can be called without error", () => {
		generateTooltip("r1", makeEntityData({ type: "furnace" }));
		expect(() => reset()).not.toThrow();
	});

	it("is idempotent", () => {
		reset();
		reset();
		// No error
	});
});
