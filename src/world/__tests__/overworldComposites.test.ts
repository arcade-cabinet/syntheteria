import { CITY_COMPOSITES } from "../../city/composites/cityComposites";
import {
	getDistrictStructureDefinition,
	getDistrictStructureDefinitions,
} from "../districtStructures";
import {
	CONSTRUCTION_BLUEPRINTS,
	getBlueprintForStructure,
	getVisiblePartIndices,
} from "../constructionSystem";
import { createNewGameConfig } from "../config";
import { generateWorldData } from "../generation";

const OVERWORLD_COMPOSITE_IDS = [
	"power_relay_station",
	"pipe_junction",
	"defensive_outpost",
	"transit_depot",
	"salvage_cache",
	"resource_node",
	"abandoned_hangar",
	"cult_breach_point",
] as const;

describe("overworld composites", () => {
	describe("composite definitions", () => {
		it("all 8 overworld composites exist in CITY_COMPOSITES", () => {
			const compositeIds = CITY_COMPOSITES.map((c) => c.id);
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				expect(compositeIds).toContain(id);
			}
		});

		it("every overworld composite has at least one part", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const composite = CITY_COMPOSITES.find((c) => c.id === id);
				expect(composite).toBeDefined();
				expect(composite!.parts.length).toBeGreaterThan(0);
			}
		});

		it("every overworld composite has the overworld tag", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const composite = CITY_COMPOSITES.find((c) => c.id === id);
				expect(composite!.tags).toContain("overworld");
			}
		});

		it("every overworld composite has a non-empty gameplayRole", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const composite = CITY_COMPOSITES.find((c) => c.id === id);
				expect(composite!.gameplayRole.length).toBeGreaterThan(0);
			}
		});

		it("every part has a valid modelId string", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const composite = CITY_COMPOSITES.find((c) => c.id === id)!;
				for (const part of composite.parts) {
					expect(typeof part.modelId).toBe("string");
					expect(part.modelId.length).toBeGreaterThan(0);
				}
			}
		});
	});

	describe("district structure definitions", () => {
		it("all 8 overworld structures have matching district structure definitions", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const definition = getDistrictStructureDefinition(id);
				expect(definition).toBeDefined();
				expect(definition.compositeId).toBe(id);
			}
		});

		it("every overworld structure has at least one capability", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const definition = getDistrictStructureDefinition(id);
				expect(definition.capabilities.length).toBeGreaterThan(0);
			}
		});

		it("overworld structures use correct roles", () => {
			const roleMap: Record<string, string> = {
				power_relay_station: "power",
				pipe_junction: "industrial",
				defensive_outpost: "defense",
				transit_depot: "transit",
				salvage_cache: "exploration",
				resource_node: "industrial",
				abandoned_hangar: "exploration",
				cult_breach_point: "hostile",
			};
			for (const [id, expectedRole] of Object.entries(roleMap)) {
				const definition = getDistrictStructureDefinition(id as any);
				expect(definition.role).toBe(expectedRole);
			}
		});

		it("total district structure count includes all overworld entries", () => {
			const allDefinitions = getDistrictStructureDefinitions();
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				expect(allDefinitions.some((d) => d.id === id)).toBe(true);
			}
		});
	});

	describe("construction blueprints", () => {
		it("all 8 overworld structures have construction blueprints", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const blueprint = getBlueprintForStructure(id);
				expect(blueprint).not.toBeNull();
				expect(blueprint!.compositeId).toBe(id);
			}
		});

		it("every blueprint totalCost equals sum of stage costs", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const bp = getBlueprintForStructure(id)!;
				const sum = bp.stages.reduce(
					(acc, stage) => ({
						scrapMetal: acc.scrapMetal + stage.cost.scrapMetal,
						eWaste: acc.eWaste + stage.cost.eWaste,
						intactComponents:
							acc.intactComponents + stage.cost.intactComponents,
					}),
					{ scrapMetal: 0, eWaste: 0, intactComponents: 0 },
				);
				expect(bp.totalCost).toEqual(sum);
			}
		});

		it("every blueprint has exactly 4 stages", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const bp = getBlueprintForStructure(id)!;
				expect(bp.stages).toHaveLength(4);
				expect(bp.stages.map((s) => s.stage)).toEqual([
					"foundation",
					"shell",
					"interior",
					"operational",
				]);
			}
		});

		it("every blueprint partIndices reference valid composite parts", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const bp = getBlueprintForStructure(id)!;
				const composite = CITY_COMPOSITES.find(
					(c) => c.id === bp.compositeId,
				)!;
				const allIndices = bp.stages.flatMap((s) => s.partIndices);
				for (const index of allIndices) {
					expect(index).toBeLessThan(composite.parts.length);
					expect(index).toBeGreaterThanOrEqual(0);
				}
			}
		});

		it("operational stage accumulates all referenced part indices", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const bp = getBlueprintForStructure(id)!;
				const operational = getVisiblePartIndices(bp, "operational");
				const allReferenced = [
					...new Set(bp.stages.flatMap((s) => s.partIndices)),
				].sort((a, b) => a - b);
				expect(operational).toEqual(allReferenced);
			}
		});

		it("every blueprint provides at least one capability", () => {
			for (const id of OVERWORLD_COMPOSITE_IDS) {
				const bp = getBlueprintForStructure(id)!;
				expect(bp.providedCapabilities.length).toBeGreaterThan(0);
			}
		});
	});

	describe("world generator integration", () => {
		it("generates structures that include overworld composite IDs", () => {
			// Use a large enough seed space to hit scatter logic
			const config = createNewGameConfig(7777, {
				sectorScale: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			});
			const data = generateWorldData(config);
			const structureIds = new Set(
				data.sectorStructures.map((s) => s.districtStructureId),
			);

			// At least some overworld composites should appear via scatter
			const overworldPresent = OVERWORLD_COMPOSITE_IDS.filter((id) =>
				structureIds.has(id),
			);
			expect(overworldPresent.length).toBeGreaterThan(0);
		});

		it("generates deterministic overworld placements for the same seed", () => {
			const config = createNewGameConfig(42, {
				sectorScale: "small",
				climateProfile: "temperate",
				stormProfile: "volatile",
			});
			const first = generateWorldData(config).sectorStructures;
			const second = generateWorldData(config).sectorStructures;
			expect(second).toEqual(first);
		});
	});
});
