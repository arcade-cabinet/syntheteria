import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BUILDING_UNLOCK_CHAINS } from "../../config/buildingUnlockDefs";
import { Building } from "../../traits";
import {
	clearBuildingUpgradeJobs,
	getBuildingUpgradeJob,
	runBuildingUpgrades,
	startBuildingUpgrade,
} from "../buildingUpgradeSystem";

describe("buildingUpgradeSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		clearBuildingUpgradeJobs();
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnBuilding(buildingType: string, tier: 1 | 2 | 3 = 1) {
		return world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				buildingType: buildingType as import("../../traits").BuildingType,
				modelId: "test",
				factionId: "player",
				hp: 50,
				maxHp: 50,
				buildingTier: tier,
			}),
		);
	}

	it("creates an upgrade job with correct turnsRemaining", () => {
		const entity = spawnBuilding("storm_transmitter");
		const result = startBuildingUpgrade(world, entity.id());
		expect(result).toEqual({ success: true });

		const job = getBuildingUpgradeJob(entity.id());
		expect(job).not.toBeNull();
		const chainDef = BUILDING_UNLOCK_CHAINS.storm_transmitter!;
		expect(job!.turnsRemaining).toBe(chainDef.tiers[2].upgradeTurns);
		expect(job!.targetTier).toBe(2);
	});

	it("ticks turnsRemaining each turn", () => {
		const entity = spawnBuilding("storm_transmitter");
		startBuildingUpgrade(world, entity.id());

		const jobBefore = getBuildingUpgradeJob(entity.id());
		const initialTurns = jobBefore!.turnsRemaining;

		runBuildingUpgrades(world);

		const jobAfter = getBuildingUpgradeJob(entity.id());
		if (initialTurns > 1) {
			expect(jobAfter).not.toBeNull();
			expect(jobAfter!.turnsRemaining).toBe(initialTurns - 1);
		}
	});

	it("completes upgrade and sets buildingTier", () => {
		const entity = spawnBuilding("relay_tower");
		startBuildingUpgrade(world, entity.id());

		const chainDef = BUILDING_UNLOCK_CHAINS.relay_tower!;
		const turns = chainDef.tiers[2].upgradeTurns;

		for (let i = 0; i < turns; i++) {
			runBuildingUpgrades(world);
		}

		const b = entity.get(Building);
		expect(b!.buildingTier).toBe(2);
		expect(getBuildingUpgradeJob(entity.id())).toBeNull();
	});

	it("rejects upgrade at max tier", () => {
		const entity = spawnBuilding("storm_transmitter", 3);
		const result = startBuildingUpgrade(world, entity.id());
		expect(result).toEqual({ success: false, reason: "max_tier" });
	});

	it("rejects upgrade for building with no chain def", () => {
		const entity = spawnBuilding("storage_hub");
		const result = startBuildingUpgrade(world, entity.id());
		expect(result).toEqual({ success: false, reason: "no_upgrades" });
	});

	it("supports tier 2 → tier 3 upgrade", () => {
		const entity = spawnBuilding("motor_pool", 2);
		const result = startBuildingUpgrade(world, entity.id());
		expect(result).toEqual({ success: true });

		const job = getBuildingUpgradeJob(entity.id());
		expect(job!.targetTier).toBe(3);
		const chainDef = BUILDING_UNLOCK_CHAINS.motor_pool!;
		expect(job!.turnsRemaining).toBe(chainDef.tiers[3].upgradeTurns);
	});

	it("clearBuildingUpgradeJobs removes all jobs", () => {
		const e1 = spawnBuilding("storm_transmitter");
		const e2 = spawnBuilding("relay_tower");
		startBuildingUpgrade(world, e1.id());
		startBuildingUpgrade(world, e2.id());

		expect(getBuildingUpgradeJob(e1.id())).not.toBeNull();
		expect(getBuildingUpgradeJob(e2.id())).not.toBeNull();

		clearBuildingUpgradeJobs();

		expect(getBuildingUpgradeJob(e1.id())).toBeNull();
		expect(getBuildingUpgradeJob(e2.id())).toBeNull();
	});
});
