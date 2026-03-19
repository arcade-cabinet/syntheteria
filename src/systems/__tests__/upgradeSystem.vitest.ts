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
	UnitUpgrade,
	UnitVisual,
} from "../../traits";
import { applyMark, getMaxTier, hasMark, parseMarks } from "../upgradeSystem";

describe("upgradeSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		// Spawn player faction with resources
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
				ferrous_scrap: 20,
				alloy_stock: 20,
				polymer_salvage: 20,
				conductor_wire: 20,
				electrolyte: 20,
				silicon_wafer: 20,
				storm_charge: 20,
				el_crystal: 20,
				scrap_metal: 20,
				e_waste: 20,
				intact_components: 20,
				thermal_fluid: 20,
				depth_salvage: 20,
			}),
		);
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnUnit(tileX: number, tileZ: number) {
		return world.spawn(
			UnitPos({ tileX, tileZ }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
				attackRange: 1,
			}),
			UnitFaction({ factionId: "player" }),
			UnitVisual({ modelId: "scout", scale: 1.0, facingAngle: 0 }),
		);
	}

	function spawnMaintenanceBay(tileX: number, tileZ: number, powered = true) {
		const entity = world.spawn(
			Building({
				tileX,
				tileZ,
				buildingType: "maintenance_bay",
				modelId: "test",
				factionId: "player",
				hp: 45,
				maxHp: 45,
			}),
		);
		if (powered) entity.add(Powered);
		return entity;
	}

	function spawnResearchLab(tileX: number, tileZ: number, powered = true) {
		const entity = world.spawn(
			Building({
				tileX,
				tileZ,
				buildingType: "research_lab",
				modelId: "test",
				factionId: "player",
				hp: 80,
				maxHp: 80,
			}),
		);
		if (powered) entity.add(Powered);
		return entity;
	}

	// ─── parseMarks / hasMark ──────────────────────────────────────────────

	describe("parseMarks", () => {
		it("returns empty array for empty string", () => {
			expect(parseMarks("")).toEqual([]);
		});

		it("parses single mark", () => {
			expect(parseMarks("reinforced_hull")).toEqual(["reinforced_hull"]);
		});

		it("parses multiple marks", () => {
			expect(parseMarks("reinforced_hull,swift_treads")).toEqual([
				"reinforced_hull",
				"swift_treads",
			]);
		});
	});

	describe("hasMark", () => {
		it("returns false for empty marks", () => {
			expect(hasMark("", "reinforced_hull")).toBe(false);
		});

		it("returns true when mark is present", () => {
			expect(hasMark("reinforced_hull,swift_treads", "swift_treads")).toBe(
				true,
			);
		});

		it("returns false when mark is absent", () => {
			expect(hasMark("reinforced_hull", "swift_treads")).toBe(false);
		});
	});

	// ─── getMaxTier ────────────────────────────────────────────────────────

	describe("getMaxTier", () => {
		it("returns tier 1 with no research labs", () => {
			expect(getMaxTier(world, "player")).toBe(1);
		});

		it("returns tier 2 with 1 powered research lab", () => {
			spawnResearchLab(10, 10);
			expect(getMaxTier(world, "player")).toBe(2);
		});

		it("returns tier 3 with 2+ powered research labs", () => {
			spawnResearchLab(10, 10);
			spawnResearchLab(15, 15);
			expect(getMaxTier(world, "player")).toBe(3);
		});

		it("unpowered research labs don't count", () => {
			spawnResearchLab(10, 10, false);
			expect(getMaxTier(world, "player")).toBe(1);
		});
	});

	// ─── applyMark ─────────────────────────────────────────────────────────

	describe("applyMark", () => {
		it("applies reinforced_hull successfully", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);

			const result = applyMark(world, unit.id(), bay.id(), "reinforced_hull");

			expect(result).toEqual({ ok: true });

			const stats = unit.get(UnitStats)!;
			expect(stats.maxHp).toBe(13); // 10 + 3
			expect(stats.hp).toBe(13); // 10 + 3
			expect(stats.defense).toBe(1); // 0 + 1

			const upgrade = unit.get(UnitUpgrade)!;
			expect(upgrade.marks).toBe("reinforced_hull");
			expect(upgrade.tier).toBe(1);
		});

		it("applies extended_range — scanRange +2", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);

			applyMark(world, unit.id(), bay.id(), "extended_range");

			const stats = unit.get(UnitStats)!;
			expect(stats.scanRange).toBe(6); // 4 + 2
		});

		it("rejects when unit is not adjacent to bay", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 8); // too far

			const result = applyMark(world, unit.id(), bay.id(), "reinforced_hull");
			expect(result).toEqual({ ok: false, reason: "not_adjacent" });
		});

		it("rejects when mark already applied", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);

			applyMark(world, unit.id(), bay.id(), "reinforced_hull");
			const result = applyMark(world, unit.id(), bay.id(), "reinforced_hull");

			expect(result).toEqual({ ok: false, reason: "already_has" });
		});

		it("rejects when bay is not powered", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6, false);

			const result = applyMark(world, unit.id(), bay.id(), "reinforced_hull");
			expect(result).toEqual({ ok: false, reason: "no_bay" });
		});

		it("rejects swift_treads when tier is too low", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);
			// swift_treads requires tier 2 (1 research lab)

			const result = applyMark(world, unit.id(), bay.id(), "swift_treads");
			expect(result).toEqual({ ok: false, reason: "tier_locked" });
		});

		it("allows swift_treads with 1 research lab", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);
			spawnResearchLab(10, 10);

			const result = applyMark(world, unit.id(), bay.id(), "swift_treads");
			expect(result).toEqual({ ok: true });

			const stats = unit.get(UnitStats)!;
			expect(stats.maxMp).toBe(4); // 3 + 1
			expect(stats.mp).toBe(4); // 3 + 1
		});

		it("rejects shield_emitter without tier 3", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);
			spawnResearchLab(10, 10); // tier 2, need tier 3

			const result = applyMark(world, unit.id(), bay.id(), "shield_emitter");
			expect(result).toEqual({ ok: false, reason: "tier_locked" });
		});

		it("allows shield_emitter with 2 research labs (tier 3)", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);
			spawnResearchLab(10, 10);
			spawnResearchLab(15, 15);

			const result = applyMark(world, unit.id(), bay.id(), "shield_emitter");
			expect(result).toEqual({ ok: true });

			const stats = unit.get(UnitStats)!;
			expect(stats.defense).toBe(2); // 0 + 2
		});

		it("rejects when cannot afford", () => {
			// Drain all resources
			for (const e of world.query(ResourcePool, Faction)) {
				e.set(ResourcePool, {
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
				});
			}

			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);

			const result = applyMark(world, unit.id(), bay.id(), "reinforced_hull");
			expect(result).toEqual({ ok: false, reason: "cannot_afford" });
		});

		it("deducts resources on success", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);

			applyMark(world, unit.id(), bay.id(), "reinforced_hull");

			// reinforced_hull costs: alloy_stock: 2, ferrous_scrap: 1
			for (const e of world.query(ResourcePool, Faction)) {
				const r = e.get(ResourcePool)!;
				expect(r.alloy_stock).toBe(18); // 20 - 2
				expect(r.ferrous_scrap).toBe(19); // 20 - 1
			}
		});

		it("stacks multiple marks on same unit", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);

			applyMark(world, unit.id(), bay.id(), "reinforced_hull");
			applyMark(world, unit.id(), bay.id(), "extended_range");

			const upgrade = unit.get(UnitUpgrade)!;
			expect(upgrade.marks).toBe("reinforced_hull,extended_range");
			expect(upgrade.tier).toBe(2); // 2 marks → tier 2
		});

		it("updates visual scale with tier progression", () => {
			const unit = spawnUnit(5, 5);
			const bay = spawnMaintenanceBay(5, 6);
			spawnResearchLab(10, 10);
			spawnResearchLab(15, 15);

			// Apply 1 mark → tier 1 (scale 1.0)
			applyMark(world, unit.id(), bay.id(), "reinforced_hull");
			expect(unit.get(UnitVisual)!.scale).toBe(1.0);

			// Apply 2nd mark → tier 2 (scale 1.1)
			applyMark(world, unit.id(), bay.id(), "extended_range");
			expect(unit.get(UnitVisual)!.scale).toBeCloseTo(1.1, 4);

			// Apply 3rd mark (tier 2 required)
			applyMark(world, unit.id(), bay.id(), "swift_treads");
			expect(unit.get(UnitVisual)!.scale).toBeCloseTo(1.1, 4);

			// Apply 4th mark → tier 3 (scale 1.2)
			applyMark(world, unit.id(), bay.id(), "shield_emitter");
			expect(unit.get(UnitVisual)!.scale).toBeCloseTo(1.2, 4);
		});

		it("rejects non-player units", () => {
			const unit = world.spawn(
				UnitPos({ tileX: 5, tileZ: 5 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
					attackRange: 1,
				}),
				UnitFaction({ factionId: "reclaimers" }),
			);
			const bay = spawnMaintenanceBay(5, 6);

			const result = applyMark(world, unit.id(), bay.id(), "reinforced_hull");
			expect(result).toEqual({ ok: false, reason: "no_unit" });
		});

		it("rejects invalid unit id", () => {
			const bay = spawnMaintenanceBay(5, 6);
			const result = applyMark(world, 99999, bay.id(), "reinforced_hull");
			expect(result).toEqual({ ok: false, reason: "no_unit" });
		});

		it("rejects non-maintenance-bay building", () => {
			const unit = spawnUnit(5, 5);
			const synthEntity = world.spawn(
				Building({
					tileX: 5,
					tileZ: 6,
					buildingType: "synthesizer",
					modelId: "test",
					factionId: "player",
					hp: 60,
					maxHp: 60,
				}),
			);
			synthEntity.add(Powered);

			const result = applyMark(
				world,
				unit.id(),
				synthEntity.id(),
				"reinforced_hull",
			);
			expect(result).toEqual({ ok: false, reason: "no_bay" });
		});
	});
});
