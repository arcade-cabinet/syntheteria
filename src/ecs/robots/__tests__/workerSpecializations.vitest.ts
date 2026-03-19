/**
 * Worker (MOBILE STORAGE) specialization track tests.
 *
 * Validates:
 *   - 3 tracks: Deep Miner, Fabricator, Salvager
 *   - Mark II-V progression per track (4 specs each)
 *   - v2 upgrades replace Mark III/IV
 *   - Track-specific radial actions
 *   - Tech tree gates (2 techs)
 *   - DAISY dig pattern constants
 *   - Query helpers
 */

import { describe, expect, it } from "vitest";
import {
	type WorkerTrack,
	type WorkerTrackSpecialization,
	WORKER_TRACKS,
	DEEP_MINER_SPECIALIZATIONS,
	FABRICATOR_SPECIALIZATIONS,
	SALVAGER_SPECIALIZATIONS,
	DEEP_MINER_V2_UPGRADES,
	FABRICATOR_V2_UPGRADES,
	SALVAGER_V2_UPGRADES,
	DEEP_MINER_ACTIONS,
	FABRICATOR_ACTIONS,
	SALVAGER_ACTIONS,
	WORKER_TRACK_TECHS,
	getWorkerTrackSpecializations,
	getWorkerTrackActions,
} from "../specializations/workerTracks";

// ─── Track structure ──────────────────────────────────────────────────────────

describe("Worker specialization tracks", () => {
	describe("3 tracks exist", () => {
		it("WORKER_TRACKS has exactly 3 entries", () => {
			const tracks = Object.keys(WORKER_TRACKS) as WorkerTrack[];
			expect(tracks).toHaveLength(3);
			expect(tracks).toContain("deep_miner");
			expect(tracks).toContain("fabricator");
			expect(tracks).toContain("salvager");
		});

		it("each track has label, description, specializations, and v2Upgrades", () => {
			for (const track of Object.values(WORKER_TRACKS)) {
				expect(track.label).toBeTruthy();
				expect(track.description).toBeTruthy();
				expect(track.specializations.length).toBeGreaterThanOrEqual(4);
				expect(track.v2Upgrades.length).toBeGreaterThanOrEqual(2);
			}
		});
	});

	// ─── Track A: Deep Miner ──────────────────────────────────────────────

	describe("Track A: Deep Miner", () => {
		it("has 4 specializations (Mark II-V)", () => {
			expect(DEEP_MINER_SPECIALIZATIONS).toHaveLength(4);
		});

		it("Mark II: Subsurface Probe — scan range + deposit reveal", () => {
			const spec = DEEP_MINER_SPECIALIZATIONS[0]!;
			expect(spec.track).toBe("deep_miner");
			expect(spec.effectType).toBe("subsurface_probe");
			expect(spec.effectValue).toBe(2);
		});

		it("Mark III: DAISY Excavation — center + 4 cardinal dig pattern", () => {
			const spec = DEEP_MINER_SPECIALIZATIONS[1]!;
			expect(spec.effectType).toBe("daisy_dig");
			expect(spec.effectValue).toBe(5); // 5 cells (center + 4 cardinal)
			expect(spec.markLevel).toBe(3);
		});

		it("Mark IV: Deep Bore — 2 levels deep, +50% resources", () => {
			const spec = DEEP_MINER_SPECIALIZATIONS[2]!;
			expect(spec.effectType).toBe("deep_bore");
			expect(spec.effectValue).toBe(2); // -2 elevation
			expect(spec.markLevel).toBe(4);
		});

		it("Mark V: Transcendent Excavator — targeted mining at range", () => {
			const spec = DEEP_MINER_SPECIALIZATIONS[3]!;
			expect(spec.effectType).toBe("targeted_mining");
			expect(spec.effectValue).toBe(3); // range 3
			expect(spec.markLevel).toBe(5);
		});

		it("DAISY dig value of 5 = center + 4 cardinal cells", () => {
			const daisy = DEEP_MINER_SPECIALIZATIONS.find(s => s.effectType === "daisy_dig")!;
			expect(daisy.effectValue).toBe(5);
			expect(daisy.description).toContain("cardinal");
			expect(daisy.description).toContain("dirt pit");
		});

		it("v2 upgrades: Seismic DAISY (3x3=9 cells) + Abyssal Bore (-3 depth)", () => {
			expect(DEEP_MINER_V2_UPGRADES).toHaveLength(2);

			const seismic = DEEP_MINER_V2_UPGRADES[0]!;
			expect(seismic.effectType).toBe("seismic_daisy");
			expect(seismic.effectValue).toBe(9); // 3x3 grid
			expect(seismic.markLevel).toBe(3);

			const abyssal = DEEP_MINER_V2_UPGRADES[1]!;
			expect(abyssal.effectType).toBe("abyssal_bore");
			expect(abyssal.effectValue).toBe(3); // -3 elevation
			expect(abyssal.markLevel).toBe(4);
		});

		it("has DAISY Dig and Target Mine radial actions", () => {
			expect(DEEP_MINER_ACTIONS).toHaveLength(2);
			expect(DEEP_MINER_ACTIONS[0]!.id).toBe("daisy_dig");
			expect(DEEP_MINER_ACTIONS[1]!.id).toBe("targeted_mine");
		});

		it("DAISY Dig requires staging", () => {
			expect(DEEP_MINER_ACTIONS[0]!.requiresStaging).toBe(true);
			expect(DEEP_MINER_ACTIONS[0]!.apCost).toBe(1);
		});
	});

	// ─── Track B: Fabricator ──────────────────────────────────────────────

	describe("Track B: Fabricator", () => {
		it("has 4 specializations (Mark II-V)", () => {
			expect(FABRICATOR_SPECIALIZATIONS).toHaveLength(4);
		});

		it("Mark II: Rapid Assembly — build speed bonus", () => {
			const spec = FABRICATOR_SPECIALIZATIONS[0]!;
			expect(spec.track).toBe("fabricator");
			expect(spec.effectType).toBe("rapid_assembly");
			expect(spec.effectValue).toBe(1);
		});

		it("Mark III: Field Repair — repair adjacent building", () => {
			const spec = FABRICATOR_SPECIALIZATIONS[1]!;
			expect(spec.effectType).toBe("field_repair");
			expect(spec.effectValue).toBe(3); // 3 HP repair
			expect(spec.markLevel).toBe(3);
		});

		it("Mark IV: Structural Upgrade — upgrade buildings in-place", () => {
			const spec = FABRICATOR_SPECIALIZATIONS[2]!;
			expect(spec.effectType).toBe("structural_upgrade");
			expect(spec.markLevel).toBe(4);
		});

		it("Mark V: Transcendent Constructor — instant build + cost reduction", () => {
			const spec = FABRICATOR_SPECIALIZATIONS[3]!;
			expect(spec.effectType).toBe("instant_fabrication");
			expect(spec.effectValue).toBe(25); // 25% cost reduction
			expect(spec.markLevel).toBe(5);
		});

		it("v2 upgrades: Nano-Repair Swarm + Architect's Vision", () => {
			expect(FABRICATOR_V2_UPGRADES).toHaveLength(2);

			const nano = FABRICATOR_V2_UPGRADES[0]!;
			expect(nano.effectType).toBe("nano_repair");
			expect(nano.effectValue).toBe(5); // 5 HP AoE repair
			expect(nano.markLevel).toBe(3);

			const architect = FABRICATOR_V2_UPGRADES[1]!;
			expect(architect.effectType).toBe("architects_vision");
			expect(architect.markLevel).toBe(4);
		});

		it("has Repair and Upgrade radial actions", () => {
			expect(FABRICATOR_ACTIONS).toHaveLength(2);
			expect(FABRICATOR_ACTIONS[0]!.id).toBe("repair_building");
			expect(FABRICATOR_ACTIONS[1]!.id).toBe("upgrade_building");
		});

		it("Repair requires adjacency and friendly target", () => {
			const repair = FABRICATOR_ACTIONS[0]!;
			expect(repair.requiresAdjacent).toBe(true);
			expect(repair.requiresFriendly).toBe(true);
			expect(repair.requiresStaging).toBe(true);
		});
	});

	// ─── Track C: Salvager ────────────────────────────────────────────────

	describe("Track C: Salvager", () => {
		it("has 4 specializations (Mark II-V)", () => {
			expect(SALVAGER_SPECIALIZATIONS).toHaveLength(4);
		});

		it("Mark II: Efficient Extraction — +25% harvest yield", () => {
			const spec = SALVAGER_SPECIALIZATIONS[0]!;
			expect(spec.track).toBe("salvager");
			expect(spec.effectType).toBe("efficient_extraction");
			expect(spec.effectValue).toBe(25); // 25%
		});

		it("Mark III: Material Analysis — rare material chance", () => {
			const spec = SALVAGER_SPECIALIZATIONS[1]!;
			expect(spec.effectType).toBe("material_analysis");
			expect(spec.effectValue).toBe(15); // 15% chance
			expect(spec.markLevel).toBe(3);
		});

		it("Mark IV: Rapid Dismantle — instant 0-AP salvage", () => {
			const spec = SALVAGER_SPECIALIZATIONS[2]!;
			expect(spec.effectType).toBe("rapid_dismantle");
			expect(spec.markLevel).toBe(4);
			expect(spec.description).toContain("instant");
			expect(spec.description).toContain("0 AP");
		});

		it("Mark V: Transcendent Recycler — 100% salvage return + el_crystal chance", () => {
			const spec = SALVAGER_SPECIALIZATIONS[3]!;
			expect(spec.effectType).toBe("total_recycling");
			expect(spec.effectValue).toBe(100); // 100% refund
			expect(spec.markLevel).toBe(5);
			expect(spec.description).toContain("el_crystal");
		});

		it("v2 upgrades: Quantum Sifting + Total Disassembly", () => {
			expect(SALVAGER_V2_UPGRADES).toHaveLength(2);

			const sifting = SALVAGER_V2_UPGRADES[0]!;
			expect(sifting.effectType).toBe("quantum_sifting");
			expect(sifting.effectValue).toBe(30); // 30% rare chance
			expect(sifting.markLevel).toBe(3);

			const disassembly = SALVAGER_V2_UPGRADES[1]!;
			expect(disassembly.effectType).toBe("total_disassembly");
			expect(disassembly.markLevel).toBe(4);
		});

		it("has Analyze and Strip radial actions", () => {
			expect(SALVAGER_ACTIONS).toHaveLength(2);
			expect(SALVAGER_ACTIONS[0]!.id).toBe("analyze_deposit");
			expect(SALVAGER_ACTIONS[1]!.id).toBe("strip_salvage");
		});

		it("Analyze is free (0 AP)", () => {
			expect(SALVAGER_ACTIONS[0]!.apCost).toBe(0);
		});

		it("Strip Salvage targets enemy buildings at range 2", () => {
			const strip = SALVAGER_ACTIONS[1]!;
			expect(strip.requiresEnemy).toBe(true);
			expect(strip.maxRange).toBe(2);
			expect(strip.cooldown).toBe(2);
		});
	});

	// ─── Tech tree gates ──────────────────────────────────────────────────

	describe("tech tree gates", () => {
		it("has 2 techs for worker specializations", () => {
			expect(WORKER_TRACK_TECHS).toHaveLength(2);
		});

		it("tier 2: Industrial Specialization unlocks all 3 tracks", () => {
			const unlock = WORKER_TRACK_TECHS[0]!;
			expect(unlock.id).toBe("industrial_specialization");
			expect(unlock.tier).toBe(2);
			expect(unlock.prerequisites).toContain("advanced_harvesting");
			expect(unlock.description).toContain("Deep Miner");
			expect(unlock.description).toContain("Fabricator");
			expect(unlock.description).toContain("Salvager");
		});

		it("tier 4: Deep Industrial Systems upgrades to v2", () => {
			const upgrade = WORKER_TRACK_TECHS[1]!;
			expect(upgrade.id).toBe("deep_industrial_systems");
			expect(upgrade.tier).toBe(4);
			expect(upgrade.prerequisites).toContain("industrial_specialization");
			expect(upgrade.prerequisites).toContain("deep_mining");
		});

		it("tech costs use valid ResourceMaterial keys", () => {
			const validMaterials = new Set([
				"ferrous_scrap", "alloy_stock", "polymer_salvage", "conductor_wire",
				"electrolyte", "silicon_wafer", "storm_charge", "el_crystal",
				"scrap_metal", "e_waste", "intact_components", "thermal_fluid", "depth_salvage",
			]);
			for (const tech of WORKER_TRACK_TECHS) {
				for (const key of Object.keys(tech.cost)) {
					expect(validMaterials.has(key)).toBe(true);
				}
			}
		});
	});

	// ─── Query helpers ────────────────────────────────────────────────────

	describe("getWorkerTrackSpecializations", () => {
		it("returns empty at Mark I", () => {
			expect(getWorkerTrackSpecializations("deep_miner", 1)).toHaveLength(0);
			expect(getWorkerTrackSpecializations("fabricator", 1)).toHaveLength(0);
			expect(getWorkerTrackSpecializations("salvager", 1)).toHaveLength(0);
		});

		it("returns Mark II spec at level 2", () => {
			const specs = getWorkerTrackSpecializations("deep_miner", 2);
			expect(specs).toHaveLength(1);
			expect(specs[0]!.effectType).toBe("subsurface_probe");
		});

		it("returns Mark II+III specs at level 3", () => {
			const specs = getWorkerTrackSpecializations("fabricator", 3);
			expect(specs).toHaveLength(2);
			expect(specs[0]!.effectType).toBe("rapid_assembly");
			expect(specs[1]!.effectType).toBe("field_repair");
		});

		it("returns Mark II+III+IV specs at level 4", () => {
			const specs = getWorkerTrackSpecializations("salvager", 4);
			expect(specs).toHaveLength(3);
			expect(specs[2]!.effectType).toBe("rapid_dismantle");
		});

		it("returns all 4 specs at Mark V", () => {
			const specs = getWorkerTrackSpecializations("deep_miner", 5);
			expect(specs).toHaveLength(4);
			expect(specs[3]!.effectType).toBe("targeted_mining");
		});

		it("v2 mode replaces Mark III/IV with upgraded versions", () => {
			const specs = getWorkerTrackSpecializations("deep_miner", 5, true);
			expect(specs).toHaveLength(4);

			const effectTypes = specs.map(s => s.effectType);
			// v2 should have seismic_daisy instead of daisy_dig
			expect(effectTypes).toContain("seismic_daisy");
			expect(effectTypes).not.toContain("daisy_dig");
			// v2 should have abyssal_bore instead of deep_bore
			expect(effectTypes).toContain("abyssal_bore");
			expect(effectTypes).not.toContain("deep_bore");
			// Mark II and V remain unchanged
			expect(effectTypes).toContain("subsurface_probe");
			expect(effectTypes).toContain("targeted_mining");
		});

		it("v2 mode for fabricator replaces correctly", () => {
			const specs = getWorkerTrackSpecializations("fabricator", 5, true);
			const effectTypes = specs.map(s => s.effectType);
			expect(effectTypes).toContain("nano_repair");
			expect(effectTypes).not.toContain("field_repair");
			expect(effectTypes).toContain("architects_vision");
			expect(effectTypes).not.toContain("structural_upgrade");
		});

		it("v2 mode for salvager replaces correctly", () => {
			const specs = getWorkerTrackSpecializations("salvager", 5, true);
			const effectTypes = specs.map(s => s.effectType);
			expect(effectTypes).toContain("quantum_sifting");
			expect(effectTypes).not.toContain("material_analysis");
			expect(effectTypes).toContain("total_disassembly");
			expect(effectTypes).not.toContain("rapid_dismantle");
		});
	});

	describe("getWorkerTrackActions", () => {
		it("deep_miner returns DEEP_MINER_ACTIONS", () => {
			expect(getWorkerTrackActions("deep_miner")).toBe(DEEP_MINER_ACTIONS);
		});

		it("fabricator returns FABRICATOR_ACTIONS", () => {
			expect(getWorkerTrackActions("fabricator")).toBe(FABRICATOR_ACTIONS);
		});

		it("salvager returns SALVAGER_ACTIONS", () => {
			expect(getWorkerTrackActions("salvager")).toBe(SALVAGER_ACTIONS);
		});
	});

	// ─── Cross-track validation ───────────────────────────────────────────

	describe("cross-track validation", () => {
		it("all tracks use the same WorkerTrackSpecialization interface", () => {
			const allSpecs: WorkerTrackSpecialization[] = [
				...DEEP_MINER_SPECIALIZATIONS,
				...FABRICATOR_SPECIALIZATIONS,
				...SALVAGER_SPECIALIZATIONS,
			];
			for (const spec of allSpecs) {
				expect(spec.track).toBeTruthy();
				expect(spec.label).toBeTruthy();
				expect(spec.effectType).toBeTruthy();
				expect(spec.description).toBeTruthy();
				expect(typeof spec.effectValue).toBe("number");
				expect(typeof spec.markLevel).toBe("number");
			}
		});

		it("no duplicate effectType across all tracks", () => {
			const allEffectTypes = [
				...DEEP_MINER_SPECIALIZATIONS,
				...FABRICATOR_SPECIALIZATIONS,
				...SALVAGER_SPECIALIZATIONS,
				...DEEP_MINER_V2_UPGRADES,
				...FABRICATOR_V2_UPGRADES,
				...SALVAGER_V2_UPGRADES,
			].map(s => s.effectType);

			const unique = new Set(allEffectTypes);
			expect(unique.size).toBe(allEffectTypes.length);
		});

		it("no duplicate action IDs across all tracks", () => {
			const allActionIds = [
				...DEEP_MINER_ACTIONS,
				...FABRICATOR_ACTIONS,
				...SALVAGER_ACTIONS,
			].map(a => a.id);

			const unique = new Set(allActionIds);
			expect(unique.size).toBe(allActionIds.length);
		});

		it("all actions have valid category", () => {
			const validCategories = new Set(["movement", "combat", "utility", "economy"]);
			const allActions = [...DEEP_MINER_ACTIONS, ...FABRICATOR_ACTIONS, ...SALVAGER_ACTIONS];
			for (const action of allActions) {
				expect(validCategories.has(action.category)).toBe(true);
			}
		});

		it("all v2 upgrades target Mark III or IV only", () => {
			const allV2 = [...DEEP_MINER_V2_UPGRADES, ...FABRICATOR_V2_UPGRADES, ...SALVAGER_V2_UPGRADES];
			for (const upgrade of allV2) {
				expect([3, 4]).toContain(upgrade.markLevel);
			}
		});
	});
});
