/**
 * Validation tests for config/combat.json
 *
 * Ensures structural integrity of the combat system config:
 * - 3 player weapons with stat blocks
 * - 6 bot types with HP, damage, range, cost, roles
 * - Cube raid state machine parameters
 * - Hacking system parameters
 * - Cube wall durability per material
 * - Veterancy system
 * - Faction hacking modifiers
 */

import combatConfig from "../combat.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAYER_WEAPONS = ["drill_lance", "voltage_arc", "cube_launcher"] as const;

const BOT_TYPES = [
	"scout",
	"soldier",
	"heavy",
	"hacker",
	"worker",
	"titan",
] as const;

const ALL_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;

const WALL_MATERIALS = [
	"rock",
	"scrap_iron",
	"copper",
	"carbon",
	"iron",
	"silicon",
	"titanium",
	"steel",
	"advanced_alloy",
] as const;

const VETERANCY_LEVELS = ["rookie", "veteran", "elite", "ace"] as const;

// ---------------------------------------------------------------------------
// Player Health
// ---------------------------------------------------------------------------

describe("player health", () => {
	it("has max HP of 100", () => {
		expect(combatConfig.playerHealth.maxHp).toBe(100);
	});

	it("titan armor bonus is reasonable", () => {
		expect(combatConfig.playerHealth.titanArmorBonusHp).toBeGreaterThan(0);
		expect(combatConfig.playerHealth.titanArmorBonusHp).toBeLessThanOrEqual(100);
	});

	it("respawn timer is positive and upgraded is shorter", () => {
		expect(combatConfig.playerHealth.respawnTimerSeconds).toBeGreaterThan(0);
		expect(combatConfig.playerHealth.respawnTimerUpgradedSeconds).toBeGreaterThan(0);
		expect(combatConfig.playerHealth.respawnTimerUpgradedSeconds).toBeLessThan(
			combatConfig.playerHealth.respawnTimerSeconds,
		);
	});

	it("powder loss on death is between 0 and 1", () => {
		expect(combatConfig.playerHealth.powderLossOnDeath).toBeGreaterThan(0);
		expect(combatConfig.playerHealth.powderLossOnDeath).toBeLessThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Player Weapons
// ---------------------------------------------------------------------------

describe("player weapons", () => {
	it("has all 3 player weapons", () => {
		for (const weapon of PLAYER_WEAPONS) {
			expect(combatConfig.playerWeapons[weapon]).toBeDefined();
		}
	});

	it("drill_lance (melee) has 4 tiers with increasing damage", () => {
		const dl = combatConfig.playerWeapons.drill_lance;
		expect(dl.type).toBe("melee");
		const tiers = dl.tiers;
		expect(Object.keys(tiers)).toHaveLength(4);

		let prevDamage = 0;
		for (const tier of ["1", "2", "3", "4"] as const) {
			expect(tiers[tier].damage).toBeGreaterThan(prevDamage);
			prevDamage = tiers[tier].damage;
			expect(tiers[tier].range).toBeGreaterThan(0);
			expect(tiers[tier].attackSpeed).toBeGreaterThan(0);
		}
	});

	it("drill_lance attack speed decreases with tier (faster attacks)", () => {
		const tiers = combatConfig.playerWeapons.drill_lance.tiers;
		expect(tiers["4"].attackSpeed).toBeLessThan(tiers["1"].attackSpeed);
	});

	it("voltage_arc (hack beam) has channel parameters", () => {
		const va = combatConfig.playerWeapons.voltage_arc;
		expect(va.type).toBe("sustained_channel");
		expect(va.range).toBeGreaterThan(0);
		expect(va.rangeWithModule).toBeGreaterThan(va.range);
		expect(va.computeCostPerSecond).toBeGreaterThan(0);
		expect(va.movementSpeedWhileChanneling).toBeGreaterThan(0);
		expect(va.movementSpeedWhileChanneling).toBeLessThan(1);
		expect(va.damageVulnerabilityWhileChanneling).toBeGreaterThan(1);
	});

	it("voltage_arc has hack targets with time and compute cost", () => {
		const targets = combatConfig.playerWeapons.voltage_arc.hackTargets;
		expect(Object.keys(targets).length).toBeGreaterThanOrEqual(10);

		for (const [, target] of Object.entries(targets)) {
			expect(target.hackTimeSeconds).toBeGreaterThan(0);
			expect(target.computeCost).toBeGreaterThan(0);
			expect(target.factionResistance).toBeGreaterThan(0);
		}
	});

	it("voltage_arc hack times scale with target difficulty", () => {
		const targets = combatConfig.playerWeapons.voltage_arc.hackTargets;
		expect(targets.feral_scout.hackTimeSeconds).toBeLessThan(
			targets.feral_heavy.hackTimeSeconds,
		);
		expect(targets.ancient_guardian.hackTimeSeconds).toBeGreaterThan(
			targets.ancient_sentinel.hackTimeSeconds,
		);
	});

	it("cube_launcher has damage for all materials", () => {
		const cl = combatConfig.playerWeapons.cube_launcher;
		expect(cl.type).toBe("ranged_projectile");
		expect(cl.maxRange).toBeGreaterThan(0);
		expect(cl.fireRate).toBeGreaterThan(0);
		expect(cl.projectileSpeed).toBeGreaterThan(0);

		const materialCount = Object.keys(cl.damageByMaterial).length;
		expect(materialCount).toBeGreaterThanOrEqual(10);

		for (const [, mat] of Object.entries(cl.damageByMaterial)) {
			expect(mat.damage).toBeGreaterThan(0);
			expect(mat.knockback).toBeGreaterThan(0);
		}
	});

	it("cube_launcher quantum_crystal does the most damage", () => {
		const mats = combatConfig.playerWeapons.cube_launcher.damageByMaterial;
		const maxDamage = Math.max(
			...Object.values(mats).map((m) => m.damage),
		);
		expect(mats.quantum_crystal.damage).toBe(maxDamage);
	});

	it("cube_launcher has recovery mechanics", () => {
		const recovery = combatConfig.playerWeapons.cube_launcher.cubeRecovery;
		expect(recovery.shatterChance).toBeGreaterThan(0);
		expect(recovery.shatterChance).toBeLessThan(1);
		expect(recovery.damagedCubeHpPercent).toBeGreaterThan(0);
		expect(recovery.damagedCubeHpPercent).toBeLessThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Bot Types
// ---------------------------------------------------------------------------

describe("bot types", () => {
	it("has all 6 bot types", () => {
		for (const bot of BOT_TYPES) {
			expect(combatConfig.botTypes[bot]).toBeDefined();
		}
	});

	it("every bot has required stat fields", () => {
		for (const bot of BOT_TYPES) {
			const b = combatConfig.botTypes[bot];
			expect(b.displayName).toBeTruthy();
			expect(typeof b.hp).toBe("number");
			expect(b.hp).toBeGreaterThan(0);
			expect(typeof b.damage).toBe("number");
			expect(b.damage).toBeGreaterThan(0);
			expect(typeof b.range).toBe("number");
			expect(b.range).toBeGreaterThan(0);
			expect(typeof b.speed).toBe("number");
			expect(b.speed).toBeGreaterThan(0);
			expect(typeof b.armor).toBe("number");
			expect(b.armor).toBeGreaterThanOrEqual(0);
			expect(b.cost).toBeDefined();
			expect(Object.keys(b.cost).length).toBeGreaterThan(0);
			expect(typeof b.buildTimeSeconds).toBe("number");
			expect(b.buildTimeSeconds).toBeGreaterThan(0);
			expect(b.role).toBeTruthy();
		}
	});

	it("bot costs reference valid materials", () => {
		const validMats = new Set([
			"rock",
			"scrap_iron",
			"copper",
			"silicon",
			"carbon",
			"titanium",
			"iron",
			"rare_earth",
			"gold",
		]);
		for (const bot of BOT_TYPES) {
			for (const mat of Object.keys(combatConfig.botTypes[bot].cost)) {
				expect(validMats.has(mat)).toBe(true);
			}
			for (const amount of Object.values(combatConfig.botTypes[bot].cost)) {
				expect(amount).toBeGreaterThan(0);
			}
		}
	});

	it("titan is the most expensive and powerful bot", () => {
		const titan = combatConfig.botTypes.titan;
		for (const bot of BOT_TYPES) {
			if (bot === "titan") continue;
			const b = combatConfig.botTypes[bot];
			expect(titan.hp).toBeGreaterThan(b.hp);
			expect(titan.damage).toBeGreaterThanOrEqual(b.damage);
		}
	});

	it("scout is the fastest bot", () => {
		const scout = combatConfig.botTypes.scout;
		for (const bot of BOT_TYPES) {
			expect(scout.speed).toBeGreaterThanOrEqual(combatConfig.botTypes[bot].speed);
		}
	});

	it("worker can harvest and carry cubes", () => {
		const worker = combatConfig.botTypes.worker as any;
		expect(worker.canHarvest).toBe(true);
		expect(worker.canCarryCubes).toBe(true);
		expect(worker.cubeCarryCapacity).toBeGreaterThan(0);
		expect(worker.repairRatePerSecond).toBeGreaterThan(0);
	});

	it("titan is unhackable", () => {
		expect((combatConfig.botTypes.titan as any).unhackable).toBe(true);
	});

	it("heavy has siege mode", () => {
		const heavy = combatConfig.botTypes.heavy as any;
		expect(heavy.siegeMode).toBeDefined();
		expect(heavy.siegeMode.damageMultiplier).toBeGreaterThan(1);
		expect(heavy.siegeMode.rangeMultiplier).toBeGreaterThan(1);
		expect(heavy.siegeMode.immobile).toBe(true);
	});

	it("heavy and titan have AoE damage", () => {
		expect((combatConfig.botTypes.heavy as any).aoeDamage).toBeGreaterThan(0);
		expect((combatConfig.botTypes.heavy as any).aoeRadius).toBeGreaterThan(0);
		expect((combatConfig.botTypes.titan as any).aoeDamage).toBeGreaterThan(0);
		expect((combatConfig.botTypes.titan as any).aoeRadius).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Veterancy
// ---------------------------------------------------------------------------

describe("veterancy system", () => {
	it("has all 4 levels", () => {
		for (const level of VETERANCY_LEVELS) {
			expect(combatConfig.veterancy[level]).toBeDefined();
		}
	});

	it("kills required increases with each level", () => {
		let prevKills = -1;
		for (const level of VETERANCY_LEVELS) {
			expect(combatConfig.veterancy[level].killsRequired).toBeGreaterThan(
				prevKills,
			);
			prevKills = combatConfig.veterancy[level].killsRequired;
		}
	});

	it("modifiers increase with each level", () => {
		let prevDmg = 0;
		for (const level of VETERANCY_LEVELS) {
			expect(combatConfig.veterancy[level].damageMod).toBeGreaterThanOrEqual(
				prevDmg,
			);
			prevDmg = combatConfig.veterancy[level].damageMod;
		}
	});

	it("rookie starts at baseline (1.0x modifiers)", () => {
		expect(combatConfig.veterancy.rookie.damageMod).toBe(1.0);
		expect(combatConfig.veterancy.rookie.hpMod).toBe(1.0);
		expect(combatConfig.veterancy.rookie.speedMod).toBe(1.0);
		expect(combatConfig.veterancy.rookie.selfRepair).toBe(0);
	});

	it("ace has self repair", () => {
		expect(combatConfig.veterancy.ace.selfRepair).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Faction Hacking
// ---------------------------------------------------------------------------

describe("faction hacking modifiers", () => {
	it("has hacking modifiers for all 4 factions", () => {
		for (const faction of ALL_FACTIONS) {
			expect(combatConfig.factionHacking[faction]).toBeDefined();
			expect(combatConfig.factionHacking[faction].hackSpeedMod).toBeGreaterThan(0);
			expect(combatConfig.factionHacking[faction].hackResistance).toBeGreaterThan(0);
		}
	});

	it("signal_choir hacks faster than other factions", () => {
		for (const faction of ALL_FACTIONS) {
			expect(
				combatConfig.factionHacking.signal_choir.hackSpeedMod,
			).toBeGreaterThanOrEqual(
				combatConfig.factionHacking[faction].hackSpeedMod,
			);
		}
	});

	it("signal_choir has highest hack resistance", () => {
		for (const faction of ALL_FACTIONS) {
			expect(
				combatConfig.factionHacking.signal_choir.hackResistance,
			).toBeGreaterThanOrEqual(
				combatConfig.factionHacking[faction].hackResistance,
			);
		}
	});
});

// ---------------------------------------------------------------------------
// Compute System
// ---------------------------------------------------------------------------

describe("compute system", () => {
	it("has base max compute", () => {
		expect(combatConfig.computeSystem.baseMaxCompute).toBeGreaterThan(0);
	});

	it("signal relay contributes compute", () => {
		expect(combatConfig.computeSystem.signalRelayComputePerMinute).toBeGreaterThan(0);
		expect(combatConfig.computeSystem.signalRelayMaxComputeAdded).toBeGreaterThan(0);
	});

	it("compute core gives more compute than signal relay", () => {
		expect(combatConfig.computeSystem.computeCorePerMinute).toBeGreaterThan(
			combatConfig.computeSystem.signalRelayComputePerMinute,
		);
	});

	it("signal amplifier gives more compute than compute core", () => {
		expect(combatConfig.computeSystem.signalAmplifierPerMinute).toBeGreaterThan(
			combatConfig.computeSystem.computeCorePerMinute,
		);
	});

	it("signal choir gets bonus from signal amplifier", () => {
		expect(
			combatConfig.computeSystem.signalAmplifierSignalChoirPerMinute,
		).toBeGreaterThan(
			combatConfig.computeSystem.signalAmplifierPerMinute,
		);
	});
});

// ---------------------------------------------------------------------------
// Raid System
// ---------------------------------------------------------------------------

describe("raid system", () => {
	it("has all raid state machine parameters", () => {
		expect(combatConfig.raid.engageRange).toBeGreaterThan(0);
		expect(combatConfig.raid.lootRange).toBeGreaterThan(0);
		expect(combatConfig.raid.maxEngageDurationSeconds).toBeGreaterThan(0);
		expect(combatConfig.raid.maxLootTimeSeconds).toBeGreaterThan(0);
		expect(combatConfig.raid.grabTimePerCubeSeconds).toBeGreaterThan(0);
	});

	it("has 6 raid states", () => {
		expect(combatConfig.raid.states).toHaveLength(6);
		expect(combatConfig.raid.states).toContain("planning");
		expect(combatConfig.raid.states).toContain("approach");
		expect(combatConfig.raid.states).toContain("engage");
		expect(combatConfig.raid.states).toContain("loot");
		expect(combatConfig.raid.states).toContain("retreat");
		expect(combatConfig.raid.states).toContain("deposit");
	});

	it("worker carries more cubes than soldier", () => {
		expect(combatConfig.raid.workerCubeCapacity).toBeGreaterThan(
			combatConfig.raid.soldierCubeCapacity,
		);
	});

	it("encumbered speed is less than full speed", () => {
		expect(combatConfig.raid.encumberedSpeedMod).toBeGreaterThan(0);
		expect(combatConfig.raid.encumberedSpeedMod).toBeLessThan(1);
	});

	it("has faction aggression modifiers for all factions", () => {
		for (const faction of ALL_FACTIONS) {
			expect(combatConfig.raid.factionAggression[faction]).toBeDefined();
			expect(
				combatConfig.raid.factionAggression[faction].aggressionMod,
			).toBeGreaterThan(0);
			expect(combatConfig.raid.factionAggression[faction].style).toBeTruthy();
		}
	});

	it("volt_collective is the most aggressive raider", () => {
		for (const faction of ALL_FACTIONS) {
			expect(
				combatConfig.raid.factionAggression.volt_collective.aggressionMod,
			).toBeGreaterThanOrEqual(
				combatConfig.raid.factionAggression[faction].aggressionMod,
			);
		}
	});

	it("raid composition has at least 5 tiers", () => {
		expect(combatConfig.raid.raidComposition.length).toBeGreaterThanOrEqual(5);
	});

	it("raid composition minRaidPoints increase", () => {
		for (let i = 1; i < combatConfig.raid.raidComposition.length; i++) {
			expect(
				combatConfig.raid.raidComposition[i].minRaidPoints,
			).toBeGreaterThan(
				combatConfig.raid.raidComposition[i - 1].minRaidPoints,
			);
		}
	});

	it("raid composition unit counts increase with raid points", () => {
		const comps = combatConfig.raid.raidComposition;
		const firstComp = comps[0];
		const lastComp = comps[comps.length - 1];
		expect(lastComp.soldiers).toBeGreaterThan(firstComp.soldiers);
		expect(lastComp.workers).toBeGreaterThan(firstComp.workers);
	});
});

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

describe("wall durability", () => {
	it("has wall HP for all standard materials", () => {
		for (const mat of WALL_MATERIALS) {
			expect(combatConfig.walls.materialWallHp[mat]).toBeDefined();
			expect(combatConfig.walls.materialWallHp[mat].perCube).toBeGreaterThan(0);
			expect(combatConfig.walls.materialWallHp[mat].perPanel).toBeGreaterThan(0);
		}
	});

	it("panel HP is always greater than per-cube HP", () => {
		for (const mat of WALL_MATERIALS) {
			expect(combatConfig.walls.materialWallHp[mat].perPanel).toBeGreaterThan(
				combatConfig.walls.materialWallHp[mat].perCube,
			);
		}
	});

	it("advanced alloy has the highest wall HP", () => {
		const maxPerCube = Math.max(
			...Object.values(combatConfig.walls.materialWallHp).map(
				(m) => m.perCube,
			),
		);
		expect(combatConfig.walls.materialWallHp.advanced_alloy.perCube).toBe(
			maxPerCube,
		);
	});

	it("rock has the lowest wall HP", () => {
		const minPerCube = Math.min(
			...Object.values(combatConfig.walls.materialWallHp).map(
				(m) => m.perCube,
			),
		);
		expect(combatConfig.walls.materialWallHp.rock.perCube).toBe(minPerCube);
	});

	it("stacking parameters are reasonable", () => {
		expect(combatConfig.walls.cubeSnapDistance).toBeGreaterThan(0);
		expect(combatConfig.walls.cubeSnapDistance).toBeLessThan(1);
		expect(combatConfig.walls.maxStackHeight).toBeGreaterThan(
			combatConfig.walls.unstableHeight,
		);
		expect(combatConfig.walls.unstableHeight).toBeGreaterThan(0);
		expect(combatConfig.walls.breachThreshold).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Siege System
// ---------------------------------------------------------------------------

describe("siege system", () => {
	it("has base destruction parameters", () => {
		const bd = combatConfig.siege.baseDestruction as any;
		expect(bd.botConfusedDurationSeconds).toBeGreaterThan(0);
		expect(bd.phoneHomeRadius).toBeGreaterThan(0);
		expect(bd.coreExplosionDamage).toBeGreaterThan(0);
		expect(bd.coreExplosionRadius).toBeGreaterThan(0);
		expect(bd.coreMaterialDropPercent).toBeGreaterThan(0);
		expect(bd.coreMaterialDropPercent).toBeLessThanOrEqual(1);
	});

	it("has supply line parameters", () => {
		const sl = combatConfig.siege.supplyLines as any;
		expect(sl.degradedThroughputThreshold).toBeGreaterThan(
			sl.severedThroughputThreshold,
		);
		expect(sl.cascadeFailureThreshold).toBeGreaterThan(0);
	});

	it("has isolation scoring weights that sum to 1.0", () => {
		const iso = combatConfig.siege.isolation as any;
		const total = iso.beltWeight + iso.relayWeight + iso.convoyWeight;
		expect(total).toBeCloseTo(1.0, 5);
	});

	it("has bombardment parameters", () => {
		const bomb = combatConfig.siege.bombardment as any;
		expect(bomb.minDurationSeconds).toBeGreaterThan(0);
		expect(bomb.maxDurationSeconds).toBeGreaterThan(bomb.minDurationSeconds);
		expect(bomb.heavySiegeDamageMultiplier).toBeGreaterThan(1);
		expect(bomb.heavySiegeRangeMultiplier).toBeGreaterThan(1);
	});

	it("has defense scaling parameters", () => {
		const def = combatConfig.siege.defense as any;
		expect(def.minDefensePriority).toBeGreaterThan(0);
		expect(def.maxDefensePriority).toBeLessThanOrEqual(1);
		expect(def.maxDefenseAllocation).toBeGreaterThan(0);
		expect(def.maxDefenseAllocation).toBeLessThanOrEqual(1);
		expect(def.alertLevelMultipliers).toHaveLength(3);
	});

	it("has loot priority order", () => {
		const loot = combatConfig.siege.loot as any;
		expect(loot.priorityOrder).toBeDefined();
		expect(loot.priorityOrder.length).toBeGreaterThan(0);
		expect(loot.priorityOrder[0]).toBe("quantum_crystal");
	});
});

// ---------------------------------------------------------------------------
// Squad Behavior
// ---------------------------------------------------------------------------

describe("squad behavior", () => {
	it("has formation spacings", () => {
		expect(combatConfig.squadBehavior.patrolSpacing).toBeGreaterThan(0);
		expect(combatConfig.squadBehavior.combatSpacing).toBeGreaterThan(
			combatConfig.squadBehavior.patrolSpacing,
		);
		expect(combatConfig.squadBehavior.siegeSpacing).toBeGreaterThan(
			combatConfig.squadBehavior.combatSpacing,
		);
	});

	it("retreat spacing is tighter than patrol", () => {
		expect(combatConfig.squadBehavior.retreatSpacing).toBeLessThan(
			combatConfig.squadBehavior.patrolSpacing,
		);
	});

	it("retreat HP threshold is reasonable", () => {
		expect(combatConfig.squadBehavior.retreatIfHpBelow).toBeGreaterThan(0);
		expect(combatConfig.squadBehavior.retreatIfHpBelow).toBeLessThan(1);
	});
});

// ---------------------------------------------------------------------------
// Ancient Machines
// ---------------------------------------------------------------------------

describe("ancient machines", () => {
	it("has 4 ancient machine types", () => {
		const am = (combatConfig as any).ancientMachines;
		expect(am.swarm_drone).toBeDefined();
		expect(am.sentinel).toBeDefined();
		expect(am.guardian).toBeDefined();
		expect(am.colossus).toBeDefined();
	});

	it("every ancient machine has HP, damage, range, speed", () => {
		const am = (combatConfig as any).ancientMachines;
		for (const [, machine] of Object.entries(am)) {
			const m = machine as any;
			expect(m.hp).toBeGreaterThan(0);
			expect(m.damage).toBeGreaterThan(0);
			expect(m.range).toBeGreaterThan(0);
			expect(typeof m.speed).toBe("number");
		}
	});

	it("colossus is the most powerful ancient machine", () => {
		const am = (combatConfig as any).ancientMachines;
		for (const [id, machine] of Object.entries(am)) {
			if (id === "colossus") continue;
			expect(am.colossus.hp).toBeGreaterThan((machine as any).hp);
		}
	});

	it("guardian has combat phases", () => {
		const guardian = (combatConfig as any).ancientMachines.guardian;
		expect(guardian.phases).toBeDefined();
		expect(Object.keys(guardian.phases).length).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Native Combat
// ---------------------------------------------------------------------------

describe("native combat", () => {
	it("has warrior stats", () => {
		const nc = (combatConfig as any).nativeCombat;
		expect(nc.warrior.hp).toBeGreaterThan(0);
		expect(nc.warrior.damage).toBeGreaterThan(0);
		expect(nc.warrior.speed).toBeGreaterThan(0);
		expect(nc.warrior.range).toBeGreaterThan(0);
		expect(nc.warrior.aggroRadius).toBeGreaterThan(0);
	});

	it("has hostility levels", () => {
		const levels = (combatConfig as any).nativeCombat.hostilityLevels;
		expect(levels.peaceful).toBeDefined();
		expect(levels.wary).toBeDefined();
		expect(levels.hostile).toBeDefined();
		expect(levels.allied).toBeDefined();
	});

	it("has village types with escalating warriors", () => {
		const villages = (combatConfig as any).nativeCombat.villages;
		expect(villages.scout_camp.warriors).toBeLessThan(villages.settlement.warriors);
		expect(villages.settlement.warriors).toBeLessThan(villages.elder_village.warriors);
	});
});

// ---------------------------------------------------------------------------
// Faction Combat Bonuses
// ---------------------------------------------------------------------------

describe("faction combat bonuses", () => {
	it("has bonuses for all 4 factions", () => {
		const fcb = (combatConfig as any).factionCombatBonuses;
		for (const faction of ALL_FACTIONS) {
			expect(fcb[faction]).toBeDefined();
			expect(fcb[faction].bonus).toBeTruthy();
		}
	});

	it("iron_creed has wall HP bonus", () => {
		const ic = (combatConfig as any).factionCombatBonuses.iron_creed;
		expect(ic.wallHpBonus).toBeGreaterThan(0);
	});

	it("signal_choir has hack speed multiplier", () => {
		const sc = (combatConfig as any).factionCombatBonuses.signal_choir;
		expect(sc.hackSpeedMultiplier).toBeGreaterThan(1);
	});
});

// ---------------------------------------------------------------------------
// Building Damage
// ---------------------------------------------------------------------------

describe("building damage", () => {
	it("has HP values for key buildings", () => {
		const bd = (combatConfig as any).buildingDamage.buildings;
		expect(bd.furnace.hp).toBeGreaterThan(0);
		expect(bd.turret.hp).toBeGreaterThan(0);
		expect(bd.outpost_core.hp).toBeGreaterThan(0);
	});

	it("outpost core has the highest HP", () => {
		const bd = (combatConfig as any).buildingDamage.buildings;
		for (const [id, building] of Object.entries(bd)) {
			if (id === "outpost_core") continue;
			expect(bd.outpost_core.hp).toBeGreaterThanOrEqual((building as any).hp);
		}
	});

	it("has 5 damage states from healthy to destroyed", () => {
		const states = (combatConfig as any).buildingDamage.damageStates;
		expect(states.healthy).toBeDefined();
		expect(states.damaged).toBeDefined();
		expect(states.critical).toBeDefined();
		expect(states.failing).toBeDefined();
		expect(states.destroyed).toBeDefined();
	});

	it("efficiency decreases through damage states", () => {
		const states = (combatConfig as any).buildingDamage.damageStates;
		expect(states.healthy.efficiency).toBeGreaterThan(states.damaged.efficiency);
		expect(states.damaged.efficiency).toBeGreaterThan(states.critical.efficiency);
		expect(states.critical.efficiency).toBeGreaterThan(states.failing.efficiency);
	});
});

// ---------------------------------------------------------------------------
// Player Health Extensions
// ---------------------------------------------------------------------------

describe("player health extensions", () => {
	it("has HP regen and out-of-combat delay", () => {
		const ph = combatConfig.playerHealth as any;
		expect(ph.hpRegenPerSecond).toBeGreaterThan(0);
		expect(ph.outOfCombatDelaySeconds).toBeGreaterThan(0);
	});

	it("has max armor DR cap", () => {
		const ph = combatConfig.playerHealth as any;
		expect(ph.maxArmorDR).toBeGreaterThan(0);
		expect(ph.maxArmorDR).toBeLessThan(1);
	});

	it("has armor sources with escalating values", () => {
		const sources = (combatConfig.playerHealth as any).armorSources;
		expect(sources.scrap_plating.armorValue).toBeLessThan(sources.iron_plating.armorValue);
		expect(sources.iron_plating.armorValue).toBeLessThan(sources.carbon_weave.armorValue);
		expect(sources.carbon_weave.armorValue).toBeLessThan(sources.titan_armor_plate.armorValue);
	});
});

// ---------------------------------------------------------------------------
// No placeholder values
// ---------------------------------------------------------------------------

describe("no placeholder values", () => {
	it("no string fields contain TODO, TBD, FIXME, or placeholder", () => {
		const json = JSON.stringify(combatConfig);
		const placeholders = ["TODO", "TBD", "FIXME", "placeholder", "xxx"];
		for (const ph of placeholders) {
			expect(json.toLowerCase()).not.toContain(ph.toLowerCase());
		}
	});
});
