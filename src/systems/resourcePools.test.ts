/**
 * @jest-environment node
 */
import {
	isFloorHarvestable,
	getResourcePoolForFloorMaterial,
	rollHarvestYield,
} from "./resourcePools";

describe("resourcePools", () => {
	describe("isFloorHarvestable", () => {
		it("returns true for known floor materials", () => {
			expect(isFloorHarvestable("metal_panel")).toBe(true);
			expect(isFloorHarvestable("concrete_slab")).toBe(true);
			expect(isFloorHarvestable("industrial_grating")).toBe(true);
			expect(isFloorHarvestable("rusty_plating")).toBe(true);
			expect(isFloorHarvestable("corroded_steel")).toBe(true);
		});

		it("returns false for unknown materials", () => {
			expect(isFloorHarvestable("unknown")).toBe(false);
			expect(isFloorHarvestable("")).toBe(false);
		});
	});

	describe("getResourcePoolForFloorMaterial", () => {
		it("returns correct pool for each floor material", () => {
			const metal = getResourcePoolForFloorMaterial("metal_panel");
			expect(metal.label).toBe("Metal Panel Floor");
			expect(metal.harvestDuration).toBe(80);
			expect(metal.yields.some((y) => y.resource === "heavy_metals")).toBe(true);

			const concrete = getResourcePoolForFloorMaterial("concrete_slab");
			expect(concrete.label).toBe("Concrete Slab Floor");

			const corroded = getResourcePoolForFloorMaterial("corroded_steel");
			expect(corroded.yields.some((y) => y.resource === "scrap")).toBe(true);
		});

		it("returns metal panel pool for unknown material", () => {
			const pool = getResourcePoolForFloorMaterial("unknown");
			expect(pool.label).toBe("Metal Panel Floor");
		});
	});

	describe("rollHarvestYield (floor)", () => {
		it("produces non-empty yields for floor pool", () => {
			const pool = getResourcePoolForFloorMaterial("metal_panel");
			const yields = rollHarvestYield(pool, 12345);
			expect(yields.size).toBeGreaterThan(0);
			for (const [resource, amount] of yields) {
				expect(amount).toBeGreaterThan(0);
			}
		});
	});
});
