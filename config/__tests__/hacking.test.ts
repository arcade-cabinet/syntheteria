import hackingConfig from "../hacking.json";

describe("hacking.json", () => {
	it("has positive range values", () => {
		expect(hackingConfig.startRange).toBeGreaterThan(0);
		expect(hackingConfig.cancelRange).toBeGreaterThan(hackingConfig.startRange);
	});

	it("has positive compute cost and progress rate", () => {
		expect(hackingConfig.baseComputeCost).toBeGreaterThan(0);
		expect(hackingConfig.progressPerCompute).toBeGreaterThan(0);
		expect(hackingConfig.progressPerCompute).toBeLessThanOrEqual(1);
	});

	it("has faction resistance values for all hostile factions", () => {
		const factions = Object.keys(hackingConfig.factionResistance);
		expect(factions).toContain("feral");
		expect(factions).toContain("cultist");
		expect(factions).toContain("rogue");

		for (const resistance of Object.values(hackingConfig.factionResistance)) {
			expect(resistance).toBeGreaterThan(0);
		}
	});

	it("has signal network config", () => {
		expect(hackingConfig.signalNetwork.computePerRelayStrength).toBeGreaterThan(0);
		expect(hackingConfig.signalNetwork.minSignalStrength).toBeGreaterThan(0);
		expect(hackingConfig.signalNetwork.minSignalStrength).toBeLessThan(1);
	});
});
