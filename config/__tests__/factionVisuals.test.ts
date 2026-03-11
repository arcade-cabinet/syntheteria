import factionVisualsConfig from "../factionVisuals.json";

describe("factionVisuals.json", () => {
	const factionIds = ["reclaimers", "volt_collective", "signal_choir", "iron_creed"] as const;

	it("has all 4 factions", () => {
		for (const id of factionIds) {
			expect(factionVisualsConfig[id]).toBeDefined();
		}
	});

	it("each faction has visual identity fields", () => {
		for (const id of factionIds) {
			const vis = factionVisualsConfig[id];
			expect(typeof vis.chassisStyle).toBe("string");
			expect(typeof vis.headStyle).toBe("string");
			expect(typeof vis.armStyle).toBe("string");
			expect(typeof vis.locomotion).toBe("string");
			expect(typeof vis.primaryColor).toBe("string");
			expect(vis.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
			expect(typeof vis.accentColor).toBe("string");
		}
	});

	it("chassis styles are all different", () => {
		const styles = factionIds.map((id) => factionVisualsConfig[id].chassisStyle);
		expect(new Set(styles).size).toBe(factionIds.length);
	});

	it("locomotion types are all different", () => {
		const types = factionIds.map((id) => factionVisualsConfig[id].locomotion);
		expect(new Set(types).size).toBe(factionIds.length);
	});
});
