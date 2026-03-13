import { createNewGameConfig } from "../config";
import { generateWorldData } from "../generation";
import { createInitialCampaignEntities } from "../startingForces";

describe("createInitialCampaignEntities", () => {
	it("builds the full starting campaign roster with rival and cult clusters", () => {
		const config = createNewGameConfig(42424, {
			sectorScale: "standard",
			climateProfile: "temperate",
			stormProfile: "volatile",
		});
		const generated = generateWorldData(config);
		const entities = createInitialCampaignEntities(generated);

		expect(entities).toHaveLength(10);
		expect(
			entities.filter((entity) => entity.faction === "player"),
		).toHaveLength(6);
		expect(
			entities.filter((entity) => entity.faction === "rogue"),
		).toHaveLength(2);
		expect(
			entities.filter((entity) => entity.faction === "cultist"),
		).toHaveLength(2);
		expect(
			entities.some(
				(entity) =>
					entity.entityId === "unit_0" &&
					entity.selected &&
					entity.botArchetypeId === "field_technician",
			),
		).toBe(true);
		expect(
			entities.some(
				(entity) =>
					entity.entityId === "bldg_5" &&
					entity.buildingType === "lightning_rod",
			),
		).toBe(true);
		expect(
			entities.every((entity) => entity.fragmentId === "world_primary"),
		).toBe(true);
	});
});
