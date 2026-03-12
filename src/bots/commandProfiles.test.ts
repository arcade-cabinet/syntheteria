import { getBotCommandProfile } from "./commandProfiles";

describe("bot command profiles", () => {
	it("gives field technicians survey, repair, and relay-oriented actions", () => {
		const profile = getBotCommandProfile("maintenance_bot");
		expect(profile.canSurvey).toBe(true);
		expect(profile.canRepair).toBe(true);
		expect(profile.canBuildRelay).toBe(true);
		expect(profile.canEstablishSubstation).toBe(false);
		expect(profile.actionHighlights).toContain("repair");
		expect(profile.roleBrief).toContain("awakening");
	});

	it("gives substation engineers structural build authority", () => {
		const profile = getBotCommandProfile("mecha_golem");
		expect(profile.canBuildRod).toBe(true);
		expect(profile.canBuildFabricator).toBe(true);
		expect(profile.canBuildRelay).toBe(true);
		expect(profile.canEstablishSubstation).toBe(true);
		expect(profile.canFortify).toBe(true);
	});

	it("keeps fabrication rigs focused on fabrication instead of movement", () => {
		const profile = getBotCommandProfile("fabrication_unit");
		expect(profile.canMove).toBe(false);
		expect(profile.canFabricate).toBe(true);
		expect(profile.preferredPreviewCategory).toBe("fabricate");
		expect(profile.tutorialPrompt).toContain("fabricate");
	});
});
