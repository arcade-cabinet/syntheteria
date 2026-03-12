import {
	createBotUnitState,
	getAllBotDefinitions,
	getBotDefinition,
} from "./definitions";

describe("bot definitions", () => {
	it("covers the full in-repo robot chassis roster", () => {
		expect(getAllBotDefinitions()).toHaveLength(9);
		expect(getBotDefinition("maintenance_bot").model).toBe("Companion-bot.glb");
		expect(getBotDefinition("quadruped_tank").model).toBe(
			"QuadrupedTank.glb",
		);
	});

	it("creates full unit trait state with archetype metadata", () => {
		expect(
			createBotUnitState({
				unitType: "utility_drone",
				components: [],
			}),
		).toMatchObject({
			type: "utility_drone",
			archetypeId: "relay_hauler",
			markLevel: 1,
			speechProfile: "quartermaster",
		});
	});
});
