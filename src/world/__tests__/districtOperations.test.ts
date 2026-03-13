import {
	getResources,
	resetResources,
	setResources,
} from "../../systems/resources";
import {
	executeDistrictOperation,
	getDistrictOperations,
} from "../districtOperations";
import {
	getRuntimeState,
	resetRuntimeState,
	setRuntimeTick,
} from "../runtimeState";

describe("districtOperations", () => {
	beforeEach(() => {
		resetResources();
		resetRuntimeState();
		setRuntimeTick(144);
	});

	it("surfaces online substation actions for founded player districts", () => {
		const operations = getDistrictOperations({
			poiType: "home_base",
			state: "founded",
		});

		expect(operations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "fabricate_components",
					status: "available",
				}),
				expect.objectContaining({
					id: "extend_relay",
					status: "available",
				}),
				expect.objectContaining({
					id: "capture_lightning",
					status: "available",
				}),
			]),
		);
	});

	it("keeps hostile district actions marked hostile for cult wards", () => {
		const operations = getDistrictOperations({
			poiType: "northern_cult_site",
			state: "surveyed",
		});

		expect(operations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "contest_incursion",
					status: "hostile",
				}),
			]),
		);
	});

	it("keeps gateway actions locked until progression reaches them", () => {
		const operations = getDistrictOperations({
			poiType: "deep_sea_gateway",
			state: "surveyed",
		});

		expect(operations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "survey_gateway",
					status: "locked",
				}),
			]),
		);
	});

	it("executes available district operations and emits a runtime event", () => {
		setResources({
			scrapMetal: 12,
			eWaste: 7,
			intactComponents: 1,
		});

		const result = executeDistrictOperation({
			cityInstanceId: 22,
			poiType: "home_base",
			state: "founded",
			operationId: "fabricate_components",
		});

		expect(result.resourceDelta).toEqual({
			scrapMetal: -2,
			eWaste: -1,
			intactComponents: 2,
		});
		expect(getResources()).toEqual(
			expect.objectContaining({
				scrapMetal: 10,
				eWaste: 6,
				intactComponents: 3,
			}),
		);
		expect(getRuntimeState().districtEvents[0]).toEqual(
			expect.objectContaining({
				cityInstanceId: 22,
				operationId: "fabricate_components",
				label: "Fabricate Components",
				tick: 144,
			}),
		);
		expect(getRuntimeState().districtEvents[0]?.description).toContain(
			"Resource shift: scrap -2, e-waste -1, intact +2.",
		);
	});

	it("fails execution when district resources are insufficient", () => {
		setResources({
			scrapMetal: 0,
			eWaste: 0,
			intactComponents: 0,
		});

		expect(() =>
			executeDistrictOperation({
				cityInstanceId: 22,
				poiType: "home_base",
				state: "founded",
				operationId: "fabricate_components",
			}),
		).toThrow("lacks required resources");
		expect(getRuntimeState().districtEvents).toHaveLength(0);
	});
});
