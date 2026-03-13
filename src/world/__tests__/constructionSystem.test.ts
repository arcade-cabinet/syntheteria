import { defaultResourcePool } from "../../systems/resources";
import {
	CONSTRUCTION_BLUEPRINTS,
	advanceConstruction,
	canAffordStage,
	deductStageCost,
	getAvailableBlueprints,
	getAvailableSlots,
	getAllSlots,
	getBlueprintForStructure,
	getNextStageCost,
	getRemainingCost,
	getVisiblePartIndices,
	isConstructionComplete,
	startConstruction,
} from "../constructionSystem";
import type { ResourcePool } from "../../systems/resources";

describe("constructionSystem", () => {
	describe("slot system", () => {
		it("returns initial slots for home_base with no capabilities", () => {
			const slots = getAvailableSlots("home_base", []);
			expect(slots.length).toBe(3);
			expect(slots.every((s) => s.tier === 0)).toBe(true);
		});

		it("unlocks tier 1 slots when relay capability is online", () => {
			const slots = getAvailableSlots("home_base", ["relay"]);
			expect(slots.some((s) => s.tier === 1)).toBe(true);
			const tier1 = slots.filter((s) => s.tier === 1);
			expect(tier1.length).toBe(1);
			expect(tier1[0]!.offset).toEqual({ x: 0, z: 6 });
		});

		it("unlocks all tier 2 slots with full capabilities", () => {
			const slots = getAvailableSlots("home_base", [
				"relay",
				"power_sink",
				"fabrication",
				"transit",
				"defense",
				"archive",
			]);
			expect(slots.length).toBe(9);
		});

		it("returns all slots regardless of unlock for getAllSlots", () => {
			const all = getAllSlots("home_base");
			expect(all.length).toBe(9);
		});

		it("handles cult site with minimal slots", () => {
			const slots = getAvailableSlots("northern_cult_site", []);
			expect(slots.length).toBe(1);
		});
	});

	describe("blueprint availability", () => {
		it("returns tier 0 blueprints with no prerequisites met", () => {
			const blueprints = getAvailableBlueprints([], 0);
			expect(blueprints.length).toBeGreaterThan(0);
			expect(
				blueprints.every(
					(bp) =>
						bp.slotTier === 0 &&
						bp.prerequisiteCapabilities.length === 0,
				),
			).toBe(true);
		});

		it("includes fabrication hub when fabrication capability is online", () => {
			const blueprints = getAvailableBlueprints(["fabrication"], 0);
			expect(
				blueprints.some((bp) => bp.compositeId === "fabrication_hub"),
			).toBe(true);
		});

		it("excludes tier 2 blueprints when max slot tier is 1", () => {
			const blueprints = getAvailableBlueprints(
				[
					"relay",
					"fabrication",
					"power_sink",
					"defense",
					"transit",
					"archive",
					"storage",
					"logistics",
				],
				1,
			);
			expect(blueprints.every((bp) => bp.slotTier <= 1)).toBe(true);
		});
	});

	describe("resource costs", () => {
		it("verifies totalCost equals sum of stage costs", () => {
			for (const bp of CONSTRUCTION_BLUEPRINTS) {
				const sum = bp.stages.reduce(
					(acc, stage) => ({
						scrapMetal: acc.scrapMetal + stage.cost.scrapMetal,
						eWaste: acc.eWaste + stage.cost.eWaste,
						intactComponents:
							acc.intactComponents + stage.cost.intactComponents,
					}),
					defaultResourcePool({ scrapMetal: 0, eWaste: 0, intactComponents: 0 }),
				);
				expect(bp.totalCost).toEqual(sum);
			}
		});

		it("checks affordability correctly", () => {
			const bp = CONSTRUCTION_BLUEPRINTS[0]!;
			const rich: ResourcePool = {
				scrapMetal: 999,
				eWaste: 999,
				intactComponents: 999,
			};
			const poor: ResourcePool = {
				scrapMetal: 0,
				eWaste: 0,
				intactComponents: 0,
			};
			expect(canAffordStage(bp, 0, rich)).toBe(true);
			expect(canAffordStage(bp, 0, poor)).toBe(false);
		});

		it("deducts stage cost correctly", () => {
			const bp = CONSTRUCTION_BLUEPRINTS[0]!;
			const resources: ResourcePool = {
				scrapMetal: 100,
				eWaste: 50,
				intactComponents: 20,
			};
			const after = deductStageCost(bp, 0, resources);
			const stage0Cost = bp.stages[0]!.cost;
			expect(after.scrapMetal).toBe(100 - stage0Cost.scrapMetal);
			expect(after.eWaste).toBe(50 - stage0Cost.eWaste);
			expect(after.intactComponents).toBe(
				20 - stage0Cost.intactComponents,
			);
		});
	});

	describe("construction lifecycle", () => {
		it("starts construction at first stage", () => {
			const progress = startConstruction(0, 0);
			expect(progress).not.toBeNull();
			expect(progress!.currentStage).toBe("foundation");
			expect(progress!.currentStageIndex).toBe(0);
			expect(progress!.ticksRemaining).toBeGreaterThan(0);
		});

		it("advances through all stages", () => {
			let progress = startConstruction(0, 0);
			expect(progress).not.toBeNull();

			const stages: string[] = [progress!.currentStage];
			while (progress) {
				const next = advanceConstruction(progress);
				if (!next) break;
				progress = next;
				stages.push(progress.currentStage);
			}

			expect(stages).toEqual([
				"foundation",
				"shell",
				"interior",
				"operational",
			]);
		});

		it("reports completion correctly", () => {
			let progress = startConstruction(0, 0);
			expect(progress).not.toBeNull();
			expect(isConstructionComplete(progress!)).toBe(false);

			while (progress) {
				const next = advanceConstruction(progress);
				if (!next) break;
				progress = next;
			}

			progress!.ticksRemaining = 0;
			expect(isConstructionComplete(progress!)).toBe(true);
		});

		it("returns null for invalid blueprint index", () => {
			expect(startConstruction(999, 0)).toBeNull();
		});
	});

	describe("visible parts", () => {
		it("shows no parts for unbuilt stage", () => {
			const bp = CONSTRUCTION_BLUEPRINTS[0]!;
			const indices = getVisiblePartIndices(bp, "unbuilt");
			expect(indices.length).toBe(0);
		});

		it("accumulates parts through stages", () => {
			const bp = CONSTRUCTION_BLUEPRINTS[0]!;
			const foundation = getVisiblePartIndices(bp, "foundation");
			const shell = getVisiblePartIndices(bp, "shell");
			const interior = getVisiblePartIndices(bp, "interior");
			const operational = getVisiblePartIndices(bp, "operational");

			expect(foundation.length).toBeGreaterThan(0);
			expect(shell.length).toBeGreaterThanOrEqual(foundation.length);
			expect(interior.length).toBeGreaterThanOrEqual(shell.length);
			expect(operational.length).toBeGreaterThanOrEqual(interior.length);
		});

		it("operational stage shows all parts for substation_core", () => {
			const bp = getBlueprintForStructure("substation_core")!;
			const allIndices = getVisiblePartIndices(bp, "operational");
			const totalParts = bp.stages.flatMap((s) => s.partIndices);
			expect(allIndices).toEqual(
				[...new Set(totalParts)].sort((a, b) => a - b),
			);
		});
	});

	describe("blueprint lookup", () => {
		it("finds blueprint by structure ID", () => {
			const bp = getBlueprintForStructure("substation_core");
			expect(bp).not.toBeNull();
			expect(bp!.compositeId).toBe("substation_core");
		});

		it("returns null for unknown structure ID", () => {
			const bp = getBlueprintForStructure(
				"nonexistent" as any,
			);
			expect(bp).toBeNull();
		});
	});

	describe("remaining cost", () => {
		it("calculates remaining cost after first stage", () => {
			const progress = startConstruction(0, 0)!;
			const remaining = getRemainingCost(progress);
			const bp = CONSTRUCTION_BLUEPRINTS[0]!;
			const firstStageCost = bp.stages[0]!.cost;

			expect(remaining.scrapMetal).toBe(
				bp.totalCost.scrapMetal - firstStageCost.scrapMetal,
			);
		});

		it("returns zero cost when construction is at final stage", () => {
			let progress = startConstruction(0, 0)!;
			while (true) {
				const next = advanceConstruction(progress);
				if (!next) break;
				progress = next;
			}
			const remaining = getRemainingCost(progress);
			expect(remaining.scrapMetal).toBe(0);
			expect(remaining.eWaste).toBe(0);
			expect(remaining.intactComponents).toBe(0);
		});
	});

	describe("next stage cost", () => {
		it("returns next stage cost for in-progress construction", () => {
			const progress = startConstruction(0, 0)!;
			const nextCost = getNextStageCost(progress);
			const bp = CONSTRUCTION_BLUEPRINTS[0]!;
			expect(nextCost).toEqual(bp.stages[1]!.cost);
		});

		it("returns null when at final stage", () => {
			let progress = startConstruction(0, 0)!;
			while (true) {
				const next = advanceConstruction(progress);
				if (!next) break;
				progress = next;
			}
			expect(getNextStageCost(progress)).toBeNull();
		});
	});
});
