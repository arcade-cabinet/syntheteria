/**
 * Motor Pool upgrade system tests (US-008).
 *
 * Tests: resource check, tier gate, upgrade success, max Mark rejection.
 * Adapted for main branch Unit trait shape (markLevel, archetypeId, speechProfile).
 */

import upgradesConfig from "../../config/upgrades.json";
import { Building, Identity, Unit, WorldPosition } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	checkUpgradeEligibility,
	findAdjacentMotorPools,
	getActiveUpgradeJobs,
	getMaxMarkForTier,
	getUpgradeCost,
	motorPoolUpgradeSystem,
	registerMotorPool,
	resetMotorPoolState,
	startUpgrade,
} from "../motorPool";
import { resetResources, setResources } from "../resources";

function spawnUnit(opts: { x: number; z: number; markLevel?: number }) {
	const entity = world.spawn(Identity, WorldPosition, Unit);
	entity.set(Identity, { id: `unit_${Math.random()}`, faction: "player" });
	entity.set(WorldPosition, { x: opts.x, y: 0, z: opts.z });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: opts.markLevel ?? 1,
		speechProfile: "mentor",
		displayName: "Bot",
		speed: 3,
		selected: false,
		components: [],
	});
	return entity;
}

function spawnMotorPool(opts: {
	x: number;
	z: number;
	tier: "basic" | "advanced" | "elite";
	powered?: boolean;
}) {
	const entityId = `mp_${Math.random()}`;
	const entity = world.spawn(Identity, WorldPosition, Building);
	entity.set(Identity, {
		id: entityId,
		faction: "player",
	});
	entity.set(WorldPosition, { x: opts.x, y: 0, z: opts.z });
	entity.set(Building, {
		type: "motor_pool",
		powered: opts.powered ?? true,
		operational: opts.powered ?? true,
		selected: false,
		components: [],
	});
	// Register in the Motor Pool state map
	registerMotorPool(entityId, opts.tier);
	return entity;
}

describe("Motor Pool upgrade system", () => {
	afterEach(() => {
		for (const entity of [...world.entities]) {
			entity.destroy();
		}
		resetMotorPoolState();
		resetResources();
	});

	describe("getMaxMarkForTier", () => {
		it("returns correct max mark for each tier from config", () => {
			expect(getMaxMarkForTier("basic")).toBe(
				upgradesConfig.motorPoolTiers.basic.maxMark,
			);
			expect(getMaxMarkForTier("advanced")).toBe(
				upgradesConfig.motorPoolTiers.advanced.maxMark,
			);
			expect(getMaxMarkForTier("elite")).toBe(
				upgradesConfig.motorPoolTiers.elite.maxMark,
			);
		});
	});

	describe("getUpgradeCost", () => {
		it("returns config-driven costs for each mark level", () => {
			const mark2Cost = getUpgradeCost(2);
			expect(mark2Cost).toEqual(upgradesConfig.markLevels.costs["2"]);

			const mark5Cost = getUpgradeCost(5);
			expect(mark5Cost).toEqual(upgradesConfig.markLevels.costs["5"]);
		});

		it("returns null for invalid mark levels", () => {
			expect(getUpgradeCost(1)).toBeNull();
			expect(getUpgradeCost(6)).toBeNull();
		});
	});

	describe("findAdjacentMotorPools", () => {
		it("finds powered Motor Pools within adjacency range", () => {
			const unit = spawnUnit({ x: 0, z: 0 });
			spawnMotorPool({ x: 2, z: 0, tier: "basic" });

			const pools = findAdjacentMotorPools(unit);
			expect(pools).toHaveLength(1);
		});

		it("ignores unpowered Motor Pools", () => {
			const unit = spawnUnit({ x: 0, z: 0 });
			spawnMotorPool({ x: 2, z: 0, tier: "basic", powered: false });

			const pools = findAdjacentMotorPools(unit);
			expect(pools).toHaveLength(0);
		});

		it("ignores Motor Pools outside range", () => {
			const unit = spawnUnit({ x: 0, z: 0 });
			spawnMotorPool({ x: 100, z: 0, tier: "basic" });

			const pools = findAdjacentMotorPools(unit);
			expect(pools).toHaveLength(0);
		});
	});

	describe("checkUpgradeEligibility", () => {
		it("allows upgrade with sufficient resources and correct tier", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 1 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			const result = checkUpgradeEligibility(unit, pool);
			expect(result.canUpgrade).toBe(true);
			expect(result.targetMark).toBe(2);
			expect(result.cost).toEqual(upgradesConfig.markLevels.costs["2"]);
		});

		it("rejects upgrade when already at max mark", () => {
			const unit = spawnUnit({
				x: 0,
				z: 0,
				markLevel: upgradesConfig.markLevels.max,
			});
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "elite" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			const result = checkUpgradeEligibility(unit, pool);
			expect(result.canUpgrade).toBe(false);
			expect(result.reason).toBe("Already at maximum Mark");
		});

		it("rejects upgrade when Motor Pool tier is too low", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 2 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			const result = checkUpgradeEligibility(unit, pool);
			expect(result.canUpgrade).toBe(false);
			expect(result.reason).toContain("Motor Pool tier too low");
		});

		it("rejects upgrade with insufficient resources", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 1 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			// Zero resources
			setResources({ scrapMetal: 0, eWaste: 0, intactComponents: 0 });

			const result = checkUpgradeEligibility(unit, pool);
			expect(result.canUpgrade).toBe(false);
			expect(result.reason).toContain("Insufficient resources");
		});

		it("basic tier gates at Mark II", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 2 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			const result = checkUpgradeEligibility(unit, pool);
			expect(result.canUpgrade).toBe(false);
			expect(result.reason).toContain("basic supports up to Mark 2");
		});

		it("advanced tier allows up to Mark III", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 2 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "advanced" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			const result = checkUpgradeEligibility(unit, pool);
			expect(result.canUpgrade).toBe(true);
			expect(result.targetMark).toBe(3);
		});

		it("elite tier allows up to Mark V", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 4 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "elite" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			const result = checkUpgradeEligibility(unit, pool);
			expect(result.canUpgrade).toBe(true);
			expect(result.targetMark).toBe(5);
		});
	});

	describe("startUpgrade", () => {
		it("deducts resources and creates upgrade job", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 1 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			const cost = upgradesConfig.markLevels.costs["2"];
			setResources({
				scrapMetal: cost.scrapMetal,
				eWaste: cost.eWaste,
				intactComponents: cost.intactComponents,
			});

			const started = startUpgrade(unit, pool);
			expect(started).toBe(true);
			expect(getActiveUpgradeJobs()).toHaveLength(1);
			expect(getActiveUpgradeJobs()[0].targetMark).toBe(2);
		});

		it("fails when requirements not met", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 1 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			setResources({ scrapMetal: 0, eWaste: 0, intactComponents: 0 });

			const started = startUpgrade(unit, pool);
			expect(started).toBe(false);
			expect(getActiveUpgradeJobs()).toHaveLength(0);
		});
	});

	describe("motorPoolUpgradeSystem tick", () => {
		it("completes upgrade after enough ticks", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 1 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			startUpgrade(unit, pool);
			const ticks = upgradesConfig.markLevels.upgradeTicks["2"];

			for (let i = 0; i < ticks; i++) {
				motorPoolUpgradeSystem();
			}

			expect(unit.get(Unit)?.markLevel).toBe(2);
			expect(getActiveUpgradeJobs()).toHaveLength(0);
		});

		it("pauses upgrade when Motor Pool loses power", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 1 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			startUpgrade(unit, pool);

			// Run half the ticks
			const totalTicks = upgradesConfig.markLevels.upgradeTicks["2"];
			const halfTicks = Math.floor(totalTicks / 2);
			for (let i = 0; i < halfTicks; i++) {
				motorPoolUpgradeSystem();
			}

			// Cut power (use entity.set since static traits return copies)
			const bComp = pool.get(Building)!;
			pool.set(Building, { ...bComp, powered: false });

			// Run remaining ticks + extra
			for (let i = 0; i < totalTicks; i++) {
				motorPoolUpgradeSystem();
			}

			// Should NOT have completed — upgrade paused
			expect(unit.get(Unit)?.markLevel).toBe(1);
			expect(getActiveUpgradeJobs()).toHaveLength(1);
		});

		it("cancels upgrade when unit is destroyed", () => {
			const unit = spawnUnit({ x: 0, z: 0, markLevel: 1 });
			const pool = spawnMotorPool({ x: 1, z: 0, tier: "basic" });

			setResources({
				scrapMetal: 100,
				eWaste: 100,
				intactComponents: 100,
			});

			startUpgrade(unit, pool);

			// Destroy the unit
			unit.destroy();

			motorPoolUpgradeSystem();

			expect(getActiveUpgradeJobs()).toHaveLength(0);
		});
	});
});
