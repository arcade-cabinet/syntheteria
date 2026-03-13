import {
	createBotUnitState,
	getAllBotDefinitions,
	getBotDefinition,
	getBotDefinitionByRole,
	getHostileBotDefinitions,
	getPlayerBotDefinitions,
	HOSTILE_ROLES,
	isPlayerRole,
	PLAYER_ROLES,
} from "./definitions";

describe("bot definitions", () => {
	it("covers all 9 chassis (6 player + 3 hostile)", () => {
		expect(getAllBotDefinitions()).toHaveLength(9);
		expect(getPlayerBotDefinitions()).toHaveLength(6);
		expect(getHostileBotDefinitions()).toHaveLength(3);
	});

	it("maps each player role to the correct model per BOT_AND_ECONOMY_REDESIGN", () => {
		expect(getBotDefinition("maintenance_bot").model).toBe("Companion-bot.glb");
		expect(getBotDefinition("maintenance_bot").role).toBe("technician");

		expect(getBotDefinition("mecha_scout").model).toBe("ReconBot.glb");
		expect(getBotDefinition("mecha_scout").role).toBe("scout");

		expect(getBotDefinition("field_fighter").model).toBe("FieldFighter.glb");
		expect(getBotDefinition("field_fighter").role).toBe("striker");

		expect(getBotDefinition("fabrication_unit").model).toBe("Mecha01.glb");
		expect(getBotDefinition("fabrication_unit").role).toBe("fabricator");

		expect(getBotDefinition("mecha_golem").model).toBe("MechaGolem.glb");
		expect(getBotDefinition("mecha_golem").role).toBe("guardian");

		expect(getBotDefinition("utility_drone").model).toBe("MobileStorageBot.glb");
		expect(getBotDefinition("utility_drone").role).toBe("hauler");
	});

	it("maps each hostile role to the correct model", () => {
		expect(getBotDefinition("feral_drone").model).toBe("Arachnoid.glb");
		expect(getBotDefinition("feral_drone").role).toBe("cult_mech");

		expect(getBotDefinition("mecha_trooper").model).toBe("MechaTrooper.glb");
		expect(getBotDefinition("mecha_trooper").role).toBe("rogue_sentinel");

		expect(getBotDefinition("quadruped_tank").model).toBe("QuadrupedTank.glb");
		expect(getBotDefinition("quadruped_tank").role).toBe("siege_engine");
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

	it("every definition has a markScaling description", () => {
		for (const def of getAllBotDefinitions()) {
			expect(def.markScaling).toBeTruthy();
		}
	});

	it("can look up definitions by role", () => {
		expect(getBotDefinitionByRole("technician")?.unitType).toBe(
			"maintenance_bot",
		);
		expect(getBotDefinitionByRole("guardian")?.unitType).toBe("mecha_golem");
		expect(getBotDefinitionByRole("siege_engine")?.unitType).toBe(
			"quadruped_tank",
		);
	});

	it("distinguishes player from hostile roles", () => {
		expect(PLAYER_ROLES).toHaveLength(6);
		expect(HOSTILE_ROLES).toHaveLength(3);
		expect(isPlayerRole("technician")).toBe(true);
		expect(isPlayerRole("cult_mech")).toBe(false);
	});

	it("hostile bots default to non-player factions", () => {
		for (const def of getHostileBotDefinitions()) {
			expect(def.startingFaction).not.toBe("player");
		}
	});

	it("player bots default to player faction", () => {
		for (const def of getPlayerBotDefinitions()) {
			expect(def.startingFaction).toBe("player");
		}
	});
});
