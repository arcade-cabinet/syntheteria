import { getBotCommandProfile, isBotCategoryAllowed } from "./commandProfiles";

describe("bot command profiles — 6-role system", () => {
	it("Technician: repair-focused, no combat or build", () => {
		const profile = getBotCommandProfile("maintenance_bot");
		expect(profile.canRepair).toBe(true);
		expect(profile.canMove).toBe(true);
		expect(profile.canSurvey).toBe(true);
		expect(profile.canAttack).toBe(false);
		expect(profile.canBuildRod).toBe(false);
		expect(profile.canFabricate).toBe(false);
		expect(profile.canHarvest).toBe(false);
		expect(profile.roleBrief).toContain("Technician");
	});

	it("Scout: survey-focused, no combat or build", () => {
		const profile = getBotCommandProfile("mecha_scout");
		expect(profile.canSurvey).toBe(true);
		expect(profile.canMove).toBe(true);
		expect(profile.canAttack).toBe(false);
		expect(profile.canRepair).toBe(false);
		expect(profile.canBuildRod).toBe(false);
		expect(profile.roleBrief).toContain("Scout");
	});

	it("Striker: melee combat specialist, no build or repair", () => {
		const profile = getBotCommandProfile("field_fighter");
		expect(profile.canAttack).toBe(true);
		expect(profile.canMove).toBe(true);
		expect(profile.canRepair).toBe(false);
		expect(profile.canBuildRod).toBe(false);
		expect(profile.canFabricate).toBe(false);
		expect(profile.roleBrief).toContain("Striker");
	});

	it("Fabricator: builds, harvests, fabricates — now mobile", () => {
		const profile = getBotCommandProfile("fabrication_unit");
		expect(profile.canMove).toBe(true);
		expect(profile.canBuildRod).toBe(true);
		expect(profile.canBuildFabricator).toBe(true);
		expect(profile.canBuildRelay).toBe(true);
		expect(profile.canEstablishSubstation).toBe(true);
		expect(profile.canFabricate).toBe(true);
		expect(profile.canHarvest).toBe(true);
		expect(profile.canAttack).toBe(false);
		expect(profile.canRepair).toBe(false);
		expect(profile.roleBrief).toContain("Fabricator");
	});

	it("Guardian: defensive combat, fortify, no build", () => {
		const profile = getBotCommandProfile("mecha_golem");
		expect(profile.canAttack).toBe(true);
		expect(profile.canFortify).toBe(true);
		expect(profile.canMove).toBe(true);
		expect(profile.canBuildRod).toBe(false);
		expect(profile.canFabricate).toBe(false);
		expect(profile.canRepair).toBe(false);
		expect(profile.roleBrief).toContain("Guardian");
	});

	it("Hauler: logistics-only, no combat or build", () => {
		const profile = getBotCommandProfile("utility_drone");
		expect(profile.canMove).toBe(true);
		expect(profile.canSurvey).toBe(true);
		expect(profile.canAttack).toBe(false);
		expect(profile.canBuildRod).toBe(false);
		expect(profile.canFabricate).toBe(false);
		expect(profile.canRepair).toBe(false);
		expect(profile.roleBrief).toContain("Hauler");
	});

	it("hostile bots cannot survey, build, or repair", () => {
		for (const hostile of [
			"feral_drone",
			"mecha_trooper",
			"quadruped_tank",
		] as const) {
			const profile = getBotCommandProfile(hostile);
			expect(profile.canSurvey).toBe(false);
			expect(profile.canBuildRod).toBe(false);
			expect(profile.canRepair).toBe(false);
			expect(profile.canFabricate).toBe(false);
			expect(profile.canAttack).toBe(true);
		}
	});

	it("isBotCategoryAllowed gates radial categories per role", () => {
		expect(isBotCategoryAllowed("maintenance_bot", "repair")).toBe(true);
		expect(isBotCategoryAllowed("maintenance_bot", "combat")).toBe(false);
		expect(isBotCategoryAllowed("fabrication_unit", "build")).toBe(true);
		expect(isBotCategoryAllowed("fabrication_unit", "combat")).toBe(false);
		expect(isBotCategoryAllowed("field_fighter", "combat")).toBe(true);
		expect(isBotCategoryAllowed("field_fighter", "build")).toBe(false);
	});
});
