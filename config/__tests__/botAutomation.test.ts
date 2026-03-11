import botAutomationConfig from "../botAutomation.json";

describe("botAutomation.json", () => {
	it("has positive guard range", () => {
		expect(botAutomationConfig.guardRange).toBeGreaterThan(0);
	});

	it("has positive follow distance", () => {
		expect(botAutomationConfig.followDistance).toBeGreaterThan(0);
	});

	it("has positive work distance", () => {
		expect(botAutomationConfig.workDistance).toBeGreaterThan(0);
	});

	it("has positive waypoint reach threshold", () => {
		expect(botAutomationConfig.waypointReachThreshold).toBeGreaterThan(0);
	});

	it("guard range exceeds follow distance", () => {
		expect(botAutomationConfig.guardRange).toBeGreaterThan(
			botAutomationConfig.followDistance,
		);
	});
});
