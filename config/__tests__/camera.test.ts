import cameraConfig from "../camera.json";

describe("camera.json", () => {
	it("has valid FOV defaults and range", () => {
		expect(cameraConfig.defaultFov).toBeGreaterThan(0);
		expect(cameraConfig.fovRange.min).toBeGreaterThan(0);
		expect(cameraConfig.fovRange.max).toBeGreaterThan(cameraConfig.fovRange.min);
		expect(cameraConfig.defaultFov).toBeGreaterThanOrEqual(cameraConfig.fovRange.min);
		expect(cameraConfig.defaultFov).toBeLessThanOrEqual(cameraConfig.fovRange.max);
	});

	it("has positive FOV lerp speed", () => {
		expect(cameraConfig.fovLerpSpeed).toBeGreaterThan(0);
	});

	it("sprint FOV bonus is positive", () => {
		expect(cameraConfig.sprintFovBonus).toBeGreaterThan(0);
	});

	describe("head bob", () => {
		it("has small amplitude values", () => {
			expect(cameraConfig.headBob.amplitudeY).toBeGreaterThan(0);
			expect(cameraConfig.headBob.amplitudeY).toBeLessThan(1);
			expect(cameraConfig.headBob.amplitudeX).toBeGreaterThan(0);
			expect(cameraConfig.headBob.amplitudeX).toBeLessThan(1);
		});

		it("has positive frequency", () => {
			expect(cameraConfig.headBob.frequency).toBeGreaterThan(0);
		});
	});

	describe("shake", () => {
		const shakeTypes = ["compression", "explosion", "damage", "cubeImpact"] as const;

		it("has all shake types", () => {
			for (const type of shakeTypes) {
				expect(cameraConfig.shake[type]).toBeDefined();
			}
		});

		it("each shake type has required parameters", () => {
			for (const type of shakeTypes) {
				const shake = cameraConfig.shake[type];
				expect(shake.intensity).toBeGreaterThan(0);
				expect(shake.duration).toBeGreaterThan(0);
				expect(shake.frequency).toBeGreaterThan(0);
				expect(shake.decayRate).toBeGreaterThan(0);
			}
		});

		it("explosion is the strongest shake", () => {
			expect(cameraConfig.shake.explosion.intensity).toBeGreaterThan(
				cameraConfig.shake.compression.intensity,
			);
		});
	});

	it("pitch clamp is approximately pi/2", () => {
		expect(cameraConfig.pitchClamp).toBeCloseTo(Math.PI / 2, 2);
	});
});
