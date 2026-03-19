import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Building, Powered } from "../../traits/building";
import { Faction } from "../../traits/faction";
import { ResourcePool } from "../../traits/resource";
import { RENEWAL_YIELDS, runResourceRenewal } from "../resourceRenewalSystem";

describe("resourceRenewalSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		// Player faction with zero resources (so we can measure gains)
		world.spawn(
			Faction({
				id: "player",
				displayName: "Player",
				color: 0x00ff00,
				persona: "otter",
				isPlayer: true,
				aggression: 0,
			}),
			ResourcePool({
				ferrous_scrap: 0,
				alloy_stock: 0,
				polymer_salvage: 0,
				conductor_wire: 0,
				electrolyte: 0,
				silicon_wafer: 0,
				storm_charge: 0,
				el_crystal: 0,
				scrap_metal: 0,
				e_waste: 0,
				intact_components: 0,
				thermal_fluid: 0,
				depth_salvage: 0,
			}),
		);
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnBuilding(type: string, factionId: string, powered: boolean) {
		const e = world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				buildingType: type as any,
				modelId: "test",
				factionId,
				hp: 50,
				maxHp: 50,
			}),
		);
		if (powered) e.add(Powered);
		return e;
	}

	function getResource(material: string): number {
		for (const e of world.query(ResourcePool, Faction)) {
			const f = e.get(Faction);
			if (!f || f.id !== "player") continue;
			const pool = e.get(ResourcePool)!;
			return (pool as any)[material] ?? 0;
		}
		return 0;
	}

	it("powered storm transmitter generates 1 storm_charge", () => {
		spawnBuilding("storm_transmitter", "player", true);

		runResourceRenewal(world);

		expect(getResource("storm_charge")).toBe(1);
	});

	it("powered geothermal tap generates 1 thermal_fluid", () => {
		spawnBuilding("geothermal_tap", "player", true);

		runResourceRenewal(world);

		expect(getResource("thermal_fluid")).toBe(1);
	});

	it("powered solar array generates 1 electrolyte", () => {
		spawnBuilding("solar_array", "player", true);

		runResourceRenewal(world);

		expect(getResource("electrolyte")).toBe(1);
	});

	it("unpowered buildings generate nothing", () => {
		spawnBuilding("storm_transmitter", "player", false);
		spawnBuilding("geothermal_tap", "player", false);
		spawnBuilding("solar_array", "player", false);

		const total = runResourceRenewal(world);

		expect(total).toBe(0);
		expect(getResource("storm_charge")).toBe(0);
		expect(getResource("thermal_fluid")).toBe(0);
		expect(getResource("electrolyte")).toBe(0);
	});

	it("non-generating buildings produce nothing", () => {
		spawnBuilding("motor_pool", "player", true);
		spawnBuilding("storage_hub", "player", true);
		spawnBuilding("defense_turret", "player", true);

		const total = runResourceRenewal(world);

		expect(total).toBe(0);
	});

	it("multiple buildings of the same type stack", () => {
		spawnBuilding("storm_transmitter", "player", true);
		spawnBuilding("storm_transmitter", "player", true);
		spawnBuilding("storm_transmitter", "player", true);

		runResourceRenewal(world);

		expect(getResource("storm_charge")).toBe(3);
	});

	it("resources go to the correct faction", () => {
		// Add an AI faction
		world.spawn(
			Faction({
				id: "iron_creed",
				displayName: "Iron Creed",
				color: 0xff0000,
				persona: "bear",
				isPlayer: false,
				aggression: 3,
			}),
			ResourcePool({
				ferrous_scrap: 0,
				alloy_stock: 0,
				polymer_salvage: 0,
				conductor_wire: 0,
				electrolyte: 0,
				silicon_wafer: 0,
				storm_charge: 0,
				el_crystal: 0,
				scrap_metal: 0,
				e_waste: 0,
				intact_components: 0,
				thermal_fluid: 0,
				depth_salvage: 0,
			}),
		);

		spawnBuilding("storm_transmitter", "iron_creed", true);

		runResourceRenewal(world);

		// Player should get nothing, iron_creed should get 1
		expect(getResource("storm_charge")).toBe(0);
	});

	it("accumulates over multiple turns", () => {
		spawnBuilding("storm_transmitter", "player", true);
		spawnBuilding("solar_array", "player", true);

		runResourceRenewal(world);
		runResourceRenewal(world);
		runResourceRenewal(world);

		expect(getResource("storm_charge")).toBe(3);
		expect(getResource("electrolyte")).toBe(3);
	});

	it("returns total resources generated", () => {
		spawnBuilding("storm_transmitter", "player", true);
		spawnBuilding("geothermal_tap", "player", true);
		spawnBuilding("solar_array", "player", true);

		const total = runResourceRenewal(world);

		expect(total).toBe(3);
	});

	it("RENEWAL_YIELDS config matches expected building types", () => {
		expect(RENEWAL_YIELDS.storm_transmitter).toEqual({
			material: "storm_charge",
			amount: 1,
		});
		expect(RENEWAL_YIELDS.geothermal_tap).toEqual({
			material: "thermal_fluid",
			amount: 1,
		});
		expect(RENEWAL_YIELDS.solar_array).toEqual({
			material: "electrolyte",
			amount: 1,
		});
	});
});
