import { createNewGameConfig } from "../config";
import { generateWorldData } from "../generation";

describe("sectorStructurePlan", () => {
	it("uses full catalog families deterministically for the same seed", () => {
		const config = createNewGameConfig(2024, {
			sectorScale: "small",
			climateProfile: "temperate",
			stormProfile: "volatile",
		});

		const first = generateWorldData(config).sectorStructures;
		const second = generateWorldData(config).sectorStructures;

		expect(second).toEqual(first);
		expect(
			first.some((structure) => structure.modelId.startsWith("walls_")),
		).toBe(true);
		expect(
			first.some((structure) => structure.modelId.startsWith("details_")),
		).toBe(true);
		expect(
			first.some((structure) => structure.modelId.startsWith("props_")),
		).toBe(true);
		expect(first.some((structure) => structure.source === "boundary")).toBe(
			true,
		);
		expect(
			first.some((structure) => structure.source === "seeded_district"),
		).toBe(true);
		expect(first.some((structure) => structure.source === "landmark")).toBe(
			true,
		);
	});
});
