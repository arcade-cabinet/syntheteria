import {
	ECUMENOPOLIS_MODEL_ATLAS,
	type ModelEntry,
} from "../../config/ecumenopolisAtlas";
import {
	type AdjacencyContext,
	getDetailCandidates,
	getDetailCount,
	getDetailDensityRule,
	getWallCandidatesForContext,
	rankModelCandidates,
	scoreModelPlacement,
	selectModelByAdjacency,
	selectWallVariant,
} from "../adjacencyValidation";

function makeContext(overrides: Partial<AdjacencyContext> = {}): AdjacencyContext {
	return {
		zone: "core",
		neighbors: { north: null, east: null, south: null, west: null },
		existingCompositeRoles: [],
		neighborTags: [],
		isZoneBoundary: false,
		hasPortalAccess: false,
		...overrides,
	};
}

describe("adjacencyValidation", () => {
	describe("scoreModelPlacement", () => {
		it("gives positive score to models matching zone affinity", () => {
			const coreModel = ECUMENOPOLIS_MODEL_ATLAS.find(
				(m) => m.zoneAffinity.includes("core") && m.family === "column",
			)!;
			const context = makeContext({ zone: "core" });
			expect(scoreModelPlacement(coreModel, context)).toBeGreaterThan(0);
		});

		it("penalizes models placed outside their zone affinity", () => {
			const breachOnlyModel: ModelEntry = {
				id: "test_breach_only",
				label: "Test",
				assetPath: "test.glb",
				family: "prop",
				bbox: { w: 1, d: 1, h: 1 },
				tris: 100,
				materialSlots: 1,
				gridFootprint: [1, 1],
				placement: "freeform",
				passability: "cover",
				rotSymmetry: 4,
				zoneAffinity: ["breach"],
				adjacencyBias: [],
				compositeRoles: [],
				visualWeight: { close: 0.5, mid: 0.3, far: 0.1 },
				bestViewAngle: 45,
				lodTier: 1,
				tags: ["test"],
			};
			const context = makeContext({ zone: "habitation" });
			expect(scoreModelPlacement(breachOnlyModel, context)).toBeLessThan(0);
		});

		it("boosts score for matching adjacency bias tags", () => {
			const model = ECUMENOPOLIS_MODEL_ATLAS.find((m) =>
				m.adjacencyBias.includes("wall_edge"),
			)!;
			const noTags = makeContext({ zone: model.zoneAffinity[0]! });
			const withTags = makeContext({
				zone: model.zoneAffinity[0]!,
				neighborTags: ["wall_edge"],
			});
			expect(scoreModelPlacement(model, withTags)).toBeGreaterThan(
				scoreModelPlacement(model, noTags),
			);
		});

		it("boosts wall models on zone boundaries", () => {
			const wallModel = ECUMENOPOLIS_MODEL_ATLAS.find(
				(m) => m.family === "wall",
			)!;
			const notBoundary = makeContext({
				zone: wallModel.zoneAffinity[0]!,
				isZoneBoundary: false,
			});
			const isBoundary = makeContext({
				zone: wallModel.zoneAffinity[0]!,
				isZoneBoundary: true,
			});
			expect(scoreModelPlacement(wallModel, isBoundary)).toBeGreaterThan(
				scoreModelPlacement(wallModel, notBoundary),
			);
		});

		it("boosts portal models when portal access is needed", () => {
			const doorModel = ECUMENOPOLIS_MODEL_ATLAS.find(
				(m) => m.passability === "portal" && m.family === "door",
			)!;
			const noPortal = makeContext({
				zone: doorModel.zoneAffinity[0]!,
			});
			const withPortal = makeContext({
				zone: doorModel.zoneAffinity[0]!,
				hasPortalAccess: true,
			});
			expect(scoreModelPlacement(doorModel, withPortal)).toBeGreaterThan(
				scoreModelPlacement(doorModel, noPortal),
			);
		});

		it("boosts detail models on zone boundaries", () => {
			const detailModel = ECUMENOPOLIS_MODEL_ATLAS.find(
				(m) => m.family === "detail_pipework",
			)!;
			const notBoundary = makeContext({
				zone: detailModel.zoneAffinity[0]!,
				isZoneBoundary: false,
			});
			const isBoundary = makeContext({
				zone: detailModel.zoneAffinity[0]!,
				isZoneBoundary: true,
			});
			expect(scoreModelPlacement(detailModel, isBoundary)).toBeGreaterThan(
				scoreModelPlacement(detailModel, notBoundary),
			);
		});
	});

	describe("rankModelCandidates", () => {
		it("returns ranked models in descending score order", () => {
			const context = makeContext({
				zone: "power",
				neighborTags: ["power_sink_array", "utility_spine"],
				isZoneBoundary: true,
			});
			const candidates = ECUMENOPOLIS_MODEL_ATLAS.filter((m) =>
				m.zoneAffinity.includes("power"),
			);
			const ranked = rankModelCandidates(candidates, context, 5);
			expect(ranked.length).toBeLessThanOrEqual(5);
			expect(ranked.length).toBeGreaterThan(0);

			const scores = ranked.map((m) =>
				scoreModelPlacement(m, context),
			);
			for (let i = 1; i < scores.length; i++) {
				expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!);
			}
		});
	});

	describe("selectModelByAdjacency", () => {
		it("returns a model from candidates", () => {
			const context = makeContext({ zone: "fabrication" });
			const candidates = ECUMENOPOLIS_MODEL_ATLAS.filter(
				(m) =>
					m.zoneAffinity.includes("fabrication") &&
					m.family === "prop",
			);
			const selected = selectModelByAdjacency(candidates, context, 42);
			expect(selected).not.toBeNull();
			expect(candidates.some((c) => c.id === selected!.id)).toBe(true);
		});

		it("returns null for empty candidates", () => {
			const context = makeContext();
			expect(selectModelByAdjacency([], context, 42)).toBeNull();
		});

		it("is deterministic with the same seed", () => {
			const context = makeContext({ zone: "core" });
			const candidates = ECUMENOPOLIS_MODEL_ATLAS.filter(
				(m) => m.zoneAffinity.includes("core"),
			);
			const a = selectModelByAdjacency(candidates, context, 42);
			const b = selectModelByAdjacency(candidates, context, 42);
			expect(a!.id).toBe(b!.id);
		});

		it("varies with different seeds", () => {
			const context = makeContext({ zone: "core" });
			const candidates = ECUMENOPOLIS_MODEL_ATLAS.filter(
				(m) => m.zoneAffinity.includes("core"),
			);
			const results = new Set<string>();
			for (let seed = 0; seed < 10; seed++) {
				const model = selectModelByAdjacency(candidates, context, seed);
				if (model) results.add(model.id);
			}
			// With poolSize=3, we should see up to 3 distinct models
			expect(results.size).toBeGreaterThan(1);
		});
	});

	describe("detail density", () => {
		it("returns a rule for every defined zone", () => {
			const zones: Array<"core" | "power" | "fabrication" | "storage" | "habitation" | "corridor" | "breach" | "cult_ruin"> = [
				"core", "power", "fabrication", "storage",
				"habitation", "corridor", "breach", "cult_ruin",
			];
			for (const zone of zones) {
				const rule = getDetailDensityRule(zone);
				expect(rule.zone).toBe(zone);
				expect(rule.maxDetailsPerCell).toBeGreaterThan(0);
			}
		});

		it("power zones have highest detail density", () => {
			const powerRule = getDetailDensityRule("power");
			const storageRule = getDetailDensityRule("storage");
			expect(powerRule.maxDetailsPerCell).toBeGreaterThan(
				storageRule.maxDetailsPerCell,
			);
		});

		it("returns higher count for boundary cells", () => {
			const counts = new Set<number>();
			for (let seed = 0; seed < 20; seed++) {
				counts.add(getDetailCount("power", true, seed));
			}
			const maxBoundary = Math.max(...counts);

			const interiorCounts = new Set<number>();
			for (let seed = 0; seed < 20; seed++) {
				interiorCounts.add(getDetailCount("power", false, seed));
			}
			const maxInterior = Math.max(...interiorCounts);

			expect(maxBoundary).toBeGreaterThanOrEqual(maxInterior);
		});

		it("returns detail candidates for fabrication zone", () => {
			const context = makeContext({ zone: "fabrication" });
			const candidates = getDetailCandidates("fabrication", context);
			expect(candidates.length).toBeGreaterThan(0);
			expect(
				candidates.every((c) =>
					c.zoneAffinity.includes("fabrication"),
				),
			).toBe(true);
		});
	});

	describe("wall variant selection", () => {
		it("selects door variant when portal access is needed", () => {
			const context = makeContext({ hasPortalAccess: true });
			expect(selectWallVariant(context)).toBe("door");
		});

		it("selects window variant between compatible zones", () => {
			const context = makeContext({
				zone: "core",
				neighbors: {
					north: "habitation",
					east: null,
					south: null,
					west: null,
				},
			});
			expect(selectWallVariant(context)).toBe("window");
		});

		it("selects solid variant between incompatible zones", () => {
			const context = makeContext({
				zone: "core",
				neighbors: {
					north: "breach",
					east: null,
					south: null,
					west: null,
				},
			});
			expect(selectWallVariant(context)).toBe("solid");
		});

		it("selects solid variant when all neighbors are same zone", () => {
			const context = makeContext({
				zone: "core",
				neighbors: {
					north: "core",
					east: "core",
					south: "core",
					west: "core",
				},
			});
			expect(selectWallVariant(context)).toBe("solid");
		});

		it("returns appropriate wall models from atlas", () => {
			const doorContext = makeContext({ hasPortalAccess: true });
			const doorWalls = getWallCandidatesForContext(doorContext);
			expect(doorWalls.length).toBeGreaterThan(0);
			expect(
				doorWalls.every((w) => w.family === "wall_door"),
			).toBe(true);

			const windowContext = makeContext({
				zone: "core",
				neighbors: {
					north: "habitation",
					east: null,
					south: null,
					west: null,
				},
			});
			const windowWalls = getWallCandidatesForContext(windowContext);
			expect(windowWalls.length).toBeGreaterThan(0);
			expect(
				windowWalls.every((w) => w.family === "wall_window"),
			).toBe(true);
		});
	});
});
