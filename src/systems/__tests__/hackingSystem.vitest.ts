import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	Building,
	Powered,
	Faction,
	ResourcePool,
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../../traits";
import {
	cancelHack,
	HackProgress,
	runHackProgress,
	startHack,
	startUnitHack,
} from "../hackingSystem";
import {
	HACKING_AP_COST,
	HACKING_BASE_DIFFICULTY,
	HACKING_RANGE,
} from "../hackingTypes";

describe("hackingSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	// ─── Helpers ────────────────────────────────────────────────────────

	function spawnHacker(
		factionId = "volt_collective",
		tileX = 0,
		tileZ = 0,
		ap = 3,
	) {
		return world.spawn(
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap,
				maxAp: 3,
				scanRange: 4,
				attack: 1,
				defense: 0,
				attackRange: 1,
				weightClass: "medium",
			}),
			UnitFaction({ factionId }),
			UnitPos({ tileX, tileZ }),
		);
	}

	function spawnBuilding(
		factionId: string,
		tileX = 2,
		tileZ = 2,
		buildingType: string = "storage_hub",
		powered = true,
	) {
		const entity = world.spawn(
			Building({
				tileX,
				tileZ,
				buildingType: buildingType as any,
				modelId: "test",
				factionId,
				hp: 50,
				maxHp: 50,
			}),
		);
		if (powered) entity.add(Powered);
		return entity;
	}

	function spawnFactionWithResources(
		factionId: string,
		resources: Partial<Record<string, number>> = {},
	) {
		return world.spawn(
			Faction({
				id: factionId,
				displayName: factionId,
				color: 0xffffff,
				persona: "raven",
				isPlayer: false,
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
				...resources,
			}),
		);
	}

	function spawnTargetUnit(
		factionId: string,
		tileX = 2,
		tileZ = 2,
		modelId = "cult_infantry",
		ap = 2,
		maxAp = 2,
	) {
		return world.spawn(
			UnitStats({
				hp: 12,
				maxHp: 12,
				ap,
				maxAp,
				scanRange: 3,
				attack: 4,
				defense: 2,
				attackRange: 1,
				weightClass: "medium",
			}),
			UnitFaction({ factionId }),
			UnitPos({ tileX, tileZ }),
			UnitVisual({ modelId, scale: 1.0, facingAngle: 0 }),
		);
	}

	// ─── startHack validation ───────────────────────────────────────────

	describe("startHack", () => {
		it("succeeds with valid volt_collective unit in range", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"disable_building",
			);
			expect(result).toEqual({ ok: true });
		});

		it("succeeds for player faction (player-as-volt)", () => {
			const hacker = spawnHacker("player", 3, 3, 3);
			const target = spawnBuilding("iron_creed");

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"disable_building",
			);
			expect(result).toEqual({ ok: true });
		});

		it("deducts AP on successful hack start", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");

			startHack(world, hacker.id(), target.id(), "disable_building");

			const stats = hacker.get(UnitStats)!;
			expect(stats.ap).toBe(3 - HACKING_AP_COST);
		});

		it("adds HackProgress trait to hacker on success", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");

			startHack(world, hacker.id(), target.id(), "disable_building");

			expect(hacker.has(HackProgress)).toBe(true);
			const progress = hacker.get(HackProgress)!;
			expect(progress.targetEntityId).toBe(target.id());
			expect(progress.turnsRemaining).toBe(HACKING_BASE_DIFFICULTY);
			expect(progress.totalTurns).toBe(HACKING_BASE_DIFFICULTY);
			expect(progress.hackType).toBe("disable_building");
		});

		it("rejects non-existent unit", () => {
			const target = spawnBuilding("iron_creed");
			const result = startHack(world, 99999, target.id(), "disable_building");
			expect(result).toEqual({ ok: false, reason: "no_unit" });
		});

		it("rejects unit with insufficient AP", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 0);
			const target = spawnBuilding("iron_creed");

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"disable_building",
			);
			expect(result).toEqual({ ok: false, reason: "no_ap" });
		});

		it("rejects non-volt faction", () => {
			const hacker = spawnHacker("iron_creed", 3, 3, 3);
			const target = spawnBuilding("signal_choir");

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"disable_building",
			);
			expect(result).toEqual({ ok: false, reason: "not_volt" });
		});

		it("rejects hacking own building", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("volt_collective");

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"disable_building",
			);
			expect(result).toEqual({ ok: false, reason: "own_building" });
		});

		it("rejects already-hacking unit", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target1 = spawnBuilding("iron_creed", 2, 2);
			const target2 = spawnBuilding("iron_creed", 3, 2);

			startHack(world, hacker.id(), target1.id(), "disable_building");
			const result = startHack(
				world,
				hacker.id(),
				target2.id(),
				"disable_building",
			);
			expect(result).toEqual({ ok: false, reason: "already_hacking" });
		});

		it("rejects non-existent target building", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const result = startHack(world, hacker.id(), 99999, "disable_building");
			expect(result).toEqual({ ok: false, reason: "no_target" });
		});

		it("rejects target out of range", () => {
			const hacker = spawnHacker("volt_collective", 0, 0, 3);
			// Place building beyond HACKING_RANGE (manhattan distance > 3)
			const target = spawnBuilding("iron_creed", HACKING_RANGE + 1, 0);

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"disable_building",
			);
			expect(result).toEqual({ ok: false, reason: "out_of_range" });
		});

		it("accepts target at exact max range", () => {
			const hacker = spawnHacker("volt_collective", 0, 0, 3);
			const target = spawnBuilding("iron_creed", HACKING_RANGE, 0);

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"disable_building",
			);
			expect(result).toEqual({ ok: true });
		});

		it("rejects convert_turret on non-turret building", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed", 2, 2, "storage_hub");

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"convert_turret",
			);
			expect(result).toEqual({ ok: false, reason: "invalid_hack_type" });
		});

		it("accepts convert_turret on defense_turret", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed", 2, 2, "defense_turret");

			const result = startHack(
				world,
				hacker.id(),
				target.id(),
				"convert_turret",
			);
			expect(result).toEqual({ ok: true });
		});
	});

	// ─── cancelHack ─────────────────────────────────────────────────────

	describe("cancelHack", () => {
		it("removes HackProgress from actively-hacking unit", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");
			startHack(world, hacker.id(), target.id(), "disable_building");

			const cancelled = cancelHack(world, hacker.id());
			expect(cancelled).toBe(true);
			expect(hacker.has(HackProgress)).toBe(false);
		});

		it("returns false for unit not currently hacking", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const cancelled = cancelHack(world, hacker.id());
			expect(cancelled).toBe(false);
		});

		it("returns false for non-existent entity id", () => {
			const cancelled = cancelHack(world, 99999);
			expect(cancelled).toBe(false);
		});
	});

	// ─── runHackProgress ────────────────────────────────────────────────

	describe("runHackProgress", () => {
		it("decrements turnsRemaining each tick", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");
			startHack(world, hacker.id(), target.id(), "disable_building");

			runHackProgress(world);

			const progress = hacker.get(HackProgress)!;
			expect(progress.turnsRemaining).toBe(HACKING_BASE_DIFFICULTY - 1);
		});

		it("completes hack when turnsRemaining reaches 0", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");
			startHack(world, hacker.id(), target.id(), "disable_building");

			// Set turnsRemaining to 1 so next tick completes it
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});

			const completed = runHackProgress(world);
			expect(completed).toBe(1);
			expect(hacker.has(HackProgress)).toBe(false);
		});

		it("returns 0 when no hacks complete", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");
			startHack(world, hacker.id(), target.id(), "disable_building");

			const completed = runHackProgress(world);
			expect(completed).toBe(0);
		});

		it("processes multiple hackers independently", () => {
			const hacker1 = spawnHacker("volt_collective", 0, 0, 3);
			const hacker2 = spawnHacker("volt_collective", 1, 0, 3);
			const target1 = spawnBuilding("iron_creed", 2, 0);
			const target2 = spawnBuilding("iron_creed", 3, 0);

			startHack(world, hacker1.id(), target1.id(), "disable_building");
			startHack(world, hacker2.id(), target2.id(), "disable_building");

			// Make hacker1's hack complete next tick, hacker2 still in progress
			hacker1.set(HackProgress, {
				...hacker1.get(HackProgress)!,
				turnsRemaining: 1,
			});

			const completed = runHackProgress(world);
			expect(completed).toBe(1);
			expect(hacker1.has(HackProgress)).toBe(false);
			expect(hacker2.has(HackProgress)).toBe(true);
		});
	});

	// ─── resolveHack effects ────────────────────────────────────────────

	describe("resolve effects", () => {
		it("disable_building removes Powered trait from target", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed", 2, 2, "storage_hub", true);
			expect(target.has(Powered)).toBe(true);

			startHack(world, hacker.id(), target.id(), "disable_building");
			// Fast-forward to completion
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});
			runHackProgress(world);

			expect(target.has(Powered)).toBe(false);
		});

		it("disable_building on unpowered building is safe (no crash)", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed", 2, 2, "storage_hub", false);

			startHack(world, hacker.id(), target.id(), "disable_building");
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});

			// Should not throw
			expect(() => runHackProgress(world)).not.toThrow();
		});

		it("steal_resources transfers resources from target faction to hacker faction", () => {
			spawnFactionWithResources("iron_creed", {
				ferrous_scrap: 10,
				alloy_stock: 3,
			});
			spawnFactionWithResources("volt_collective", { ferrous_scrap: 2 });

			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");

			startHack(world, hacker.id(), target.id(), "steal_resources");
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});
			runHackProgress(world);

			// Check iron_creed lost resources
			for (const e of world.query(Faction, ResourcePool)) {
				const f = e.get(Faction)!;
				const pool = e.get(ResourcePool)!;
				if (f.id === "iron_creed") {
					// ferrous_scrap had 10, steal_amount=5 → 5 remaining
					expect(pool.ferrous_scrap).toBe(5);
					// alloy_stock had 3, steal_amount=5 but only 3 available → 0 remaining
					expect(pool.alloy_stock).toBe(0);
				} else if (f.id === "volt_collective") {
					// ferrous_scrap had 2 + 5 stolen = 7
					expect(pool.ferrous_scrap).toBe(7);
					// alloy_stock had 0 + 3 stolen = 3
					expect(pool.alloy_stock).toBe(3);
				}
			}
		});

		it("steal_resources with no resources to steal still completes", () => {
			spawnFactionWithResources("iron_creed", {}); // all zeros
			spawnFactionWithResources("volt_collective", {});

			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");

			startHack(world, hacker.id(), target.id(), "steal_resources");
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});

			const completed = runHackProgress(world);
			expect(completed).toBe(1);
			expect(hacker.has(HackProgress)).toBe(false);
		});

		it("convert_turret flips building faction to hacker faction", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed", 2, 2, "defense_turret");

			startHack(world, hacker.id(), target.id(), "convert_turret");
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});
			runHackProgress(world);

			const building = target.get(Building)!;
			expect(building.factionId).toBe("volt_collective");
		});

		it("hack does nothing if target building was destroyed mid-hack", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed");

			startHack(world, hacker.id(), target.id(), "disable_building");
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});

			// Destroy target before hack completes
			target.destroy();

			// Should not throw, hack simply fizzles
			expect(() => runHackProgress(world)).not.toThrow();
			expect(hacker.has(HackProgress)).toBe(false);
		});
	});

	// ─── Full multi-turn flow ───────────────────────────────────────────

	describe("full multi-turn flow", () => {
		it("hack progresses over multiple turns and resolves", () => {
			const hacker = spawnHacker("volt_collective", 3, 3, 3);
			const target = spawnBuilding("iron_creed", 2, 2, "defense_turret");

			startHack(world, hacker.id(), target.id(), "convert_turret");

			// Run for HACKING_BASE_DIFFICULTY turns
			for (let i = 0; i < HACKING_BASE_DIFFICULTY - 1; i++) {
				const completed = runHackProgress(world);
				expect(completed).toBe(0);
				expect(hacker.has(HackProgress)).toBe(true);
			}

			// Final tick should complete
			const completed = runHackProgress(world);
			expect(completed).toBe(1);
			expect(hacker.has(HackProgress)).toBe(false);
			expect(target.get(Building)!.factionId).toBe("volt_collective");
		});
	});

	// ─── Unit Capture (startUnitHack) ───────────────────────────────────

	describe("startUnitHack", () => {
		it("succeeds — any faction can hack enemy units", () => {
			const hacker = spawnHacker("iron_creed", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0);

			const result = startUnitHack(world, hacker.id(), target.id());
			expect(result).toEqual({ ok: true });
		});

		it("deducts AP on success", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0);

			startUnitHack(world, hacker.id(), target.id());
			expect(hacker.get(UnitStats)!.ap).toBe(3 - HACKING_AP_COST);
		});

		it("adds HackProgress with capture_unit type", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0);

			startUnitHack(world, hacker.id(), target.id());

			expect(hacker.has(HackProgress)).toBe(true);
			const progress = hacker.get(HackProgress)!;
			expect(progress.targetEntityId).toBe(target.id());
			expect(progress.hackType).toBe("capture_unit");
		});

		it("rejects hacking own unit", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("player", 2, 0);

			const result = startUnitHack(world, hacker.id(), target.id());
			expect(result).toEqual({ ok: false, reason: "own_unit" });
		});

		it("rejects unit out of range", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", HACKING_RANGE + 1, 0);

			const result = startUnitHack(world, hacker.id(), target.id());
			expect(result).toEqual({ ok: false, reason: "out_of_range" });
		});

		it("rejects insufficient AP", () => {
			const hacker = spawnHacker("player", 0, 0, 0);
			const target = spawnTargetUnit("el_cult", 2, 0);

			const result = startUnitHack(world, hacker.id(), target.id());
			expect(result).toEqual({ ok: false, reason: "no_ap" });
		});

		it("rejects already-hacking unit", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target1 = spawnTargetUnit("el_cult", 1, 0);
			const target2 = spawnTargetUnit("el_cult", 2, 0);

			startUnitHack(world, hacker.id(), target1.id());
			const result = startUnitHack(world, hacker.id(), target2.id());
			expect(result).toEqual({ ok: false, reason: "already_hacking" });
		});

		it("rejects non-existent target", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const result = startUnitHack(world, hacker.id(), 99999);
			expect(result).toEqual({ ok: false, reason: "no_target" });
		});
	});

	// ─── Unit Capture Resolution ────────────────────────────────────────

	describe("capture_unit resolution", () => {
		it("flips target unit faction to hacker faction", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0, "cult_infantry");

			startUnitHack(world, hacker.id(), target.id());
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});
			runHackProgress(world);

			expect(target.get(UnitFaction)!.factionId).toBe("player");
		});

		it("applies HackedBotRole stats — cult_ranged gets attackRange 2", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0, "cult_ranged", 2, 2);

			startUnitHack(world, hacker.id(), target.id());
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});
			runHackProgress(world);

			const stats = target.get(UnitStats)!;
			expect(stats.attackRange).toBe(2); // cult_ranged HackedBotRole.attackRange
		});

		it("applies apModifier for cult_cavalry (1.3x)", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0, "cult_cavalry", 4, 4);

			startUnitHack(world, hacker.id(), target.id());
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});
			runHackProgress(world);

			const stats = target.get(UnitStats)!;
			// cult_cavalry apModifier=1.3, maxAp=4 → floor(4*1.3) = 5
			expect(stats.maxAp).toBe(5);
			expect(stats.ap).toBe(5);
		});

		it("retains original model after capture", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0, "cult_infantry");

			startUnitHack(world, hacker.id(), target.id());
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});
			runHackProgress(world);

			// Model unchanged — unit keeps its visual identity
			expect(target.get(UnitVisual)!.modelId).toBe("cult_infantry");
		});

		it("fizzles silently if target unit destroyed mid-hack", () => {
			const hacker = spawnHacker("player", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0);

			startUnitHack(world, hacker.id(), target.id());
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});

			target.destroy();

			expect(() => runHackProgress(world)).not.toThrow();
			expect(hacker.has(HackProgress)).toBe(false);
		});

		it("non-volt faction (iron_creed) can capture a cult unit", () => {
			const hacker = spawnHacker("iron_creed", 0, 0, 3);
			const target = spawnTargetUnit("el_cult", 2, 0, "cult_ranged");

			startUnitHack(world, hacker.id(), target.id());
			hacker.set(HackProgress, {
				...hacker.get(HackProgress)!,
				turnsRemaining: 1,
			});
			runHackProgress(world);

			expect(target.get(UnitFaction)!.factionId).toBe("iron_creed");
		});
	});
});
