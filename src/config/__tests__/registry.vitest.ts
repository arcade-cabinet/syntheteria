import { afterEach, describe, expect, it } from "vitest";
import {
	applyConfigOverrides,
	clearConfigOverrides,
	getConfig,
	getConfigOverrides,
	setConfigOverride,
} from "../registry";

afterEach(() => {
	clearConfigOverrides();
});

describe("config registry — defaults", () => {
	it("returns victory.turnCap from gameDefaults", () => {
		expect(getConfig<number>("victory.turnCap")).toBe(200);
	});

	it("returns victory.networkPercent", () => {
		expect(getConfig<number>("victory.networkPercent")).toBe(50);
	});

	it("returns victory.reclamationPercent", () => {
		expect(getConfig<number>("victory.reclamationPercent")).toBe(30);
	});

	it("returns victory.reclamationMinLevel", () => {
		expect(getConfig<number>("victory.reclamationMinLevel")).toBe(3);
	});

	it("returns buildings.motor_pool.hp", () => {
		expect(getConfig<number>("buildings.motor_pool.hp")).toBe(80);
	});

	it("returns buildings.motor_pool.buildCost as object", () => {
		const cost = getConfig<Record<string, number>>(
			"buildings.motor_pool.buildCost",
		);
		expect(cost).toBeDefined();
		expect(cost.iron_ore).toBe(6);
	});

	it("returns epochs.0 as full epoch object", () => {
		const epoch = getConfig<{ id: string }>("epochs.0");
		expect(epoch.id).toBe("emergence");
	});

	it("returns epochs.2.cultSpawnMod", () => {
		expect(getConfig<number>("epochs.2.cultSpawnMod")).toBe(0.6);
	});

	it("returns score.territoryWeight", () => {
		expect(getConfig<number>("score.territoryWeight")).toBe(2);
	});

	it("returns score.buildingWeight", () => {
		expect(getConfig<number>("score.buildingWeight")).toBe(2);
	});

	it("returns balance.cultSpawnInterval", () => {
		expect(getConfig<number>("balance.cultSpawnInterval")).toBe(4);
	});

	it("returns balance.cultMaxTotal", () => {
		expect(getConfig<number>("balance.cultMaxTotal")).toBe(20);
	});

	it("returns biomes.grassland as object", () => {
		const biome = getConfig<{ label: string }>("biomes.grassland");
		expect(biome.label).toBe("Grassland");
	});

	it("returns biomes.forest.movementCost", () => {
		expect(getConfig<number>("biomes.forest.movementCost")).toBeGreaterThan(1);
	});

	it("returns diplomacy.peaceDriftTurns", () => {
		expect(getConfig<number>("diplomacy.peaceDriftTurns")).toBe(10);
	});

	it("returns territory.unitRadius", () => {
		expect(getConfig<number>("territory.unitRadius")).toBe(2);
	});

	it("returns undefined for unknown key within valid domain", () => {
		expect(getConfig("victory.nonexistent")).toBeUndefined();
	});
});

describe("config registry — overrides", () => {
	it("setConfigOverride overrides a value", () => {
		expect(getConfig<number>("victory.turnCap")).toBe(200);
		setConfigOverride("victory.turnCap", 500);
		expect(getConfig<number>("victory.turnCap")).toBe(500);
	});

	it("clearConfigOverrides restores defaults", () => {
		setConfigOverride("victory.turnCap", 999);
		expect(getConfig<number>("victory.turnCap")).toBe(999);
		clearConfigOverrides();
		expect(getConfig<number>("victory.turnCap")).toBe(200);
	});

	it("applyConfigOverrides applies multiple at once", () => {
		applyConfigOverrides({
			"victory.turnCap": 100,
			"score.territoryWeight": 10,
		});
		expect(getConfig<number>("victory.turnCap")).toBe(100);
		expect(getConfig<number>("score.territoryWeight")).toBe(10);
	});

	it("getConfigOverrides returns current overrides", () => {
		setConfigOverride("victory.turnCap", 42);
		setConfigOverride("balance.cultMaxTotal", 99);
		const overrides = getConfigOverrides();
		expect(overrides["victory.turnCap"]).toBe(42);
		expect(overrides["balance.cultMaxTotal"]).toBe(99);
	});

	it("override can set any type", () => {
		setConfigOverride("buildings.motor_pool.buildCost", { iron_ore: 999 });
		const cost = getConfig<Record<string, number>>(
			"buildings.motor_pool.buildCost",
		);
		expect(cost.iron_ore).toBe(999);
	});
});

describe("config registry — errors", () => {
	it("throws on unknown domain", () => {
		expect(() => getConfig("nonexistent.key")).toThrow(
			"Unknown config domain: nonexistent",
		);
	});
});
