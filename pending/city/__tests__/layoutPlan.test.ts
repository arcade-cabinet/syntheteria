import { buildBlankCityAssembly } from "../assemblyContract";
import { buildCityLayoutPlan, getPlacementsForCell } from "../layoutPlan";
import { validateCityLayoutPlan } from "../layoutValidation";
import { getCityAssetsForZone } from "../moduleCatalog";

describe("city layout planning", () => {
	it("covers the Quaternius city kit with cataloged structural families", () => {
		expect(getCityAssetsForZone("corridor", "floor").length).toBeGreaterThan(0);
		expect(getCityAssetsForZone("fabrication", "door").length).toBeGreaterThan(
			0,
		);
		expect(getCityAssetsForZone("storage", "prop").length).toBeGreaterThan(0);
		expect(getCityAssetsForZone("power", "roof").length).toBeGreaterThan(0);
	});

	it("builds a deterministic layout plan with floors and structures", () => {
		const plan = buildCityLayoutPlan(1234);
		const entryFloor = getPlacementsForCell(
			plan,
			plan.contract.entryCell.x,
			plan.contract.entryCell.y,
			"floor",
		);

		expect(plan.placements.length).toBeGreaterThan(plan.contract.cells.length);
		expect(entryFloor).toHaveLength(1);
		expect(
			plan.placements.some((placement) => placement.layer === "structure"),
		).toBe(true);
	});

	it("validates the default city contract as traversable and enclosed", () => {
		const contract = buildBlankCityAssembly(42);
		const plan = buildCityLayoutPlan(42, contract);

		expect(validateCityLayoutPlan(plan)).toEqual([]);
	});

	it("detects disconnected passable cells", () => {
		const contract = buildBlankCityAssembly(42);
		const isolated = contract.cells.find(
			(cell) => cell.x === 1 && cell.y === 1,
		);
		if (!isolated) {
			throw new Error("Expected isolation test cell to exist.");
		}
		isolated.module = "corridor";
		isolated.passable = true;

		const issues = validateCityLayoutPlan(buildCityLayoutPlan(42, contract));

		expect(
			issues.some((issue) => issue.code === "disconnected_passable_cell"),
		).toBe(true);
	});
});
