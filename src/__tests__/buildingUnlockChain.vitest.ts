/**
 * Building unlock chain integration test — verifies the building-driven
 * progression system works correctly from starter buildings to endgame.
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	BUILDING_UNLOCK_CHAINS,
	isBuildingUnlocked,
	STARTER_BUILDINGS,
} from "../config/buildingUnlockDefs";
import {
	clearBuildingUpgradeJobs,
	getBuildingUpgradeJob,
	runBuildingUpgrades,
	startBuildingUpgrade,
} from "../systems/buildingUpgradeSystem";
import { _resetToasts } from "../systems/toastNotifications";
import type { BuildingType } from "../traits";
import { Building, Faction, ResourcePool } from "../traits";

describe("Building Unlock Chain Integration", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		clearBuildingUpgradeJobs();
		_resetToasts();

		world.spawn(
			Faction({
				id: "player",
				displayName: "Player",
				color: 0xffffff,
				persona: "otter",
				isPlayer: true,
				aggression: 0,
			}),
			ResourcePool({
				iron_ore: 500,
				steel: 500,
				circuits: 500,
				glass: 500,
				alloy: 500,
				quantum_crystal: 500,
				stone: 500,
				timber: 500,
			}),
		);
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnBuilding(buildingType: string, tier: 1 | 2 | 3 = 1) {
		return world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				buildingType: buildingType as BuildingType,
				modelId: "test",
				factionId: "player",
				hp: 50,
				maxHp: 50,
				buildingTier: tier,
			}),
		);
	}

	it("starter buildings are always unlocked", () => {
		const owned = new Map<BuildingType, number>();
		for (const bt of STARTER_BUILDINGS) {
			expect(isBuildingUnlocked(bt, owned)).toBe(true);
		}
	});

	it("upgrading storm transmitter to tier 2 unlocks power plant", () => {
		const entity = spawnBuilding("storm_transmitter");
		const result = startBuildingUpgrade(world, entity.id(), 1, 10);
		expect(result.success).toBe(true);

		const chain = BUILDING_UNLOCK_CHAINS.storm_transmitter!;
		for (let i = 0; i < chain.tiers[2].upgradeTurns; i++) {
			runBuildingUpgrades(world);
		}

		const b = entity.get(Building)!;
		expect(b.buildingTier).toBe(2);

		const owned = new Map<BuildingType, number>();
		owned.set("storm_transmitter", 2);
		expect(isBuildingUnlocked("power_plant" as BuildingType, owned)).toBe(true);
		expect(isBuildingUnlocked("solar_array" as BuildingType, owned)).toBe(true);
	});

	it("tier 1 storm transmitter does not unlock power plant", () => {
		const owned = new Map<BuildingType, number>();
		owned.set("storm_transmitter", 1);
		expect(isBuildingUnlocked("power_plant" as BuildingType, owned)).toBe(
			false,
		);
	});

	it("relay tower tier 2 unlocks outpost", () => {
		const entity = spawnBuilding("relay_tower");
		const result = startBuildingUpgrade(world, entity.id(), 1, 10);
		expect(result.success).toBe(true);

		const chain = BUILDING_UNLOCK_CHAINS.relay_tower!;
		for (let i = 0; i < chain.tiers[2].upgradeTurns; i++) {
			runBuildingUpgrades(world);
		}

		const b = entity.get(Building)!;
		expect(b.buildingTier).toBe(2);

		const owned = new Map<BuildingType, number>();
		owned.set("relay_tower", 2);
		expect(isBuildingUnlocked("outpost" as BuildingType, owned)).toBe(true);
	});

	it("motor pool tier 2 unlocks maintenance bay", () => {
		const owned = new Map<BuildingType, number>();
		owned.set("motor_pool", 2);
		expect(isBuildingUnlocked("maintenance_bay" as BuildingType, owned)).toBe(
			true,
		);
	});

	it("full unlock chain from starter to wormhole stabilizer", () => {
		const stormEntity = spawnBuilding("storm_transmitter");
		startBuildingUpgrade(world, stormEntity.id(), 1, 10);
		const stormChain = BUILDING_UNLOCK_CHAINS.storm_transmitter!;
		for (let i = 0; i < stormChain.tiers[2].upgradeTurns; i++) {
			runBuildingUpgrades(world);
		}
		expect(stormEntity.get(Building)!.buildingTier).toBe(2);

		startBuildingUpgrade(world, stormEntity.id(), 2, 30);
		for (let i = 0; i < stormChain.tiers[3].upgradeTurns; i++) {
			runBuildingUpgrades(world);
		}
		expect(stormEntity.get(Building)!.buildingTier).toBe(3);

		const synthEntity = spawnBuilding("synthesizer");
		startBuildingUpgrade(world, synthEntity.id(), 1, 10);
		const synthChain = BUILDING_UNLOCK_CHAINS.synthesizer!;
		for (let i = 0; i < synthChain.tiers[2].upgradeTurns; i++) {
			runBuildingUpgrades(world);
		}
		expect(synthEntity.get(Building)!.buildingTier).toBe(2);

		startBuildingUpgrade(world, synthEntity.id(), 2, 30);
		for (let i = 0; i < synthChain.tiers[3].upgradeTurns; i++) {
			runBuildingUpgrades(world);
		}
		expect(synthEntity.get(Building)!.buildingTier).toBe(3);

		const owned = new Map<BuildingType, number>();
		owned.set("storm_transmitter", 3);
		owned.set("synthesizer", 3);
		expect(
			isBuildingUnlocked("wormhole_stabilizer" as BuildingType, owned),
		).toBe(true);
	});

	it("wormhole stabilizer NOT unlocked without both tier 3 buildings", () => {
		const owned = new Map<BuildingType, number>();
		owned.set("storm_transmitter", 3);
		owned.set("synthesizer", 2);
		expect(
			isBuildingUnlocked("wormhole_stabilizer" as BuildingType, owned),
		).toBe(false);

		owned.set("storm_transmitter", 2);
		owned.set("synthesizer", 3);
		expect(
			isBuildingUnlocked("wormhole_stabilizer" as BuildingType, owned),
		).toBe(false);
	});
});
