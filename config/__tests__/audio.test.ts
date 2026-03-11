import audioConfig from "../audio.json";

describe("audio.json", () => {
	const volumeKeys = [
		"masterVolume",
		"sfxVolume",
		"ambientVolume",
		"musicVolume",
		"stormAmbienceVolume",
		"combatSfxVolume",
		"uiFeedbackVolume",
	] as const;

	it("has all volume channels", () => {
		for (const key of volumeKeys) {
			expect(typeof audioConfig[key]).toBe("number");
		}
	});

	it("all volumes are between 0 and 1", () => {
		for (const key of volumeKeys) {
			expect(audioConfig[key]).toBeGreaterThanOrEqual(0);
			expect(audioConfig[key]).toBeLessThanOrEqual(1);
		}
	});

	it("master volume is positive", () => {
		expect(audioConfig.masterVolume).toBeGreaterThan(0);
	});
});
