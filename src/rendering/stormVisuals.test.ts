import {
	getLightningFrequency,
	getParticleCount,
	getParticleDensity,
	getStormColorGrade,
	getStormVisualProfile,
	getWormholeGlow,
	STORM_COLOR_GRADES,
	WORMHOLE_VISIBLE_TICK,
} from "./stormVisuals";

describe("stormVisuals", () => {
	describe("getStormVisualProfile", () => {
		it("returns 'surge' at intensity 1.0", () => {
			expect(getStormVisualProfile(1.0)).toBe("surge");
		});

		it("returns 'surge' at intensity 1.5", () => {
			expect(getStormVisualProfile(1.5)).toBe("surge");
		});

		it("returns 'calm' at intensity 0.4", () => {
			expect(getStormVisualProfile(0.4)).toBe("calm");
		});

		it("returns 'calm' at intensity 0.0", () => {
			expect(getStormVisualProfile(0.0)).toBe("calm");
		});

		it("returns 'standard' at intensity 0.7", () => {
			expect(getStormVisualProfile(0.7)).toBe("standard");
		});

		it("returns 'standard' at intensity 0.5", () => {
			expect(getStormVisualProfile(0.5)).toBe("standard");
		});

		it("returns 'standard' at intensity 0.99", () => {
			expect(getStormVisualProfile(0.99)).toBe("standard");
		});
	});

	describe("getParticleDensity", () => {
		it("returns 0 at intensity 0", () => {
			expect(getParticleDensity(0)).toBe(0);
		});

		it("returns 1 at intensity 1.0", () => {
			expect(getParticleDensity(1.0)).toBe(1);
		});

		it("clamps above 1", () => {
			expect(getParticleDensity(1.5)).toBe(1);
		});

		it("clamps below 0", () => {
			expect(getParticleDensity(-0.5)).toBe(0);
		});

		it("returns 0.5 at intensity 0.5", () => {
			expect(getParticleDensity(0.5)).toBe(0.5);
		});
	});

	describe("getParticleCount", () => {
		it("returns 0 at intensity 0", () => {
			expect(getParticleCount(0, 1000)).toBe(0);
		});

		it("returns maxParticles at intensity 1.0", () => {
			expect(getParticleCount(1.0, 1000)).toBe(1000);
		});

		it("returns half at intensity 0.5", () => {
			expect(getParticleCount(0.5, 1000)).toBe(500);
		});

		it("returns maxParticles when clamped above 1", () => {
			expect(getParticleCount(1.5, 1000)).toBe(1000);
		});

		it("floors to integer", () => {
			expect(getParticleCount(0.33, 100)).toBe(33);
		});
	});

	describe("getLightningFrequency", () => {
		it("returns 0 below threshold", () => {
			expect(getLightningFrequency(0)).toBe(0);
			expect(getLightningFrequency(0.3)).toBe(0);
		});

		it("returns positive at 0.5 intensity", () => {
			const freq = getLightningFrequency(0.5);
			expect(freq).toBeGreaterThan(0);
			expect(freq).toBeLessThan(8);
		});

		it("caps at 8 for very high intensity", () => {
			expect(getLightningFrequency(1.5)).toBe(8);
		});

		it("scales linearly above threshold", () => {
			const low = getLightningFrequency(0.5);
			const high = getLightningFrequency(0.8);
			expect(high).toBeGreaterThan(low);
		});
	});

	describe("getWormholeGlow", () => {
		it("returns 0 before visible tick", () => {
			expect(getWormholeGlow(1.0, 0, WORMHOLE_VISIBLE_TICK)).toBe(0);
			expect(
				getWormholeGlow(1.0, WORMHOLE_VISIBLE_TICK - 1, WORMHOLE_VISIBLE_TICK),
			).toBe(0);
		});

		it("starts fading in at visible tick", () => {
			const glow = getWormholeGlow(
				1.0,
				WORMHOLE_VISIBLE_TICK + 1,
				WORMHOLE_VISIBLE_TICK,
			);
			expect(glow).toBeGreaterThan(0);
			expect(glow).toBeLessThan(1);
		});

		it("reaches full brightness after fade-in period", () => {
			const glow = getWormholeGlow(
				1.0,
				WORMHOLE_VISIBLE_TICK + 600,
				WORMHOLE_VISIBLE_TICK,
			);
			// intensity 1.0: intensityScale = 0.3 + 0.7 = 1.0, fadeIn = 1.0
			expect(glow).toBe(1.0);
		});

		it("scales with storm intensity", () => {
			const tick = WORMHOLE_VISIBLE_TICK + 600;
			const low = getWormholeGlow(0.3, tick, WORMHOLE_VISIBLE_TICK);
			const high = getWormholeGlow(1.0, tick, WORMHOLE_VISIBLE_TICK);
			expect(high).toBeGreaterThan(low);
		});

		it("returns dim glow at low storm intensity after fade-in", () => {
			const glow = getWormholeGlow(
				0.0,
				WORMHOLE_VISIBLE_TICK + 600,
				WORMHOLE_VISIBLE_TICK,
			);
			// intensityScale = 0.3 + 0 = 0.3
			expect(glow).toBeCloseTo(0.3);
		});
	});

	describe("getStormColorGrade", () => {
		it("returns surge colors at high intensity", () => {
			expect(getStormColorGrade(1.2)).toBe(STORM_COLOR_GRADES.surge);
		});

		it("returns calm colors at low intensity", () => {
			expect(getStormColorGrade(0.2)).toBe(STORM_COLOR_GRADES.calm);
		});

		it("returns standard colors at mid intensity", () => {
			expect(getStormColorGrade(0.7)).toBe(STORM_COLOR_GRADES.standard);
		});
	});

	describe("STORM_COLOR_GRADES", () => {
		it("has all three profiles defined", () => {
			expect(STORM_COLOR_GRADES.standard).toBeDefined();
			expect(STORM_COLOR_GRADES.surge).toBeDefined();
			expect(STORM_COLOR_GRADES.calm).toBeDefined();
		});

		it("surge clouds are brighter than standard", () => {
			const stdSum = STORM_COLOR_GRADES.standard.lightCloud.reduce(
				(a, b) => a + b,
				0,
			);
			const surgeSum = STORM_COLOR_GRADES.surge.lightCloud.reduce(
				(a, b) => a + b,
				0,
			);
			expect(surgeSum).toBeGreaterThan(stdSum);
		});

		it("calm clouds are dimmer than standard", () => {
			const stdSum = STORM_COLOR_GRADES.standard.lightCloud.reduce(
				(a, b) => a + b,
				0,
			);
			const calmSum = STORM_COLOR_GRADES.calm.lightCloud.reduce(
				(a, b) => a + b,
				0,
			);
			expect(calmSum).toBeLessThan(stdSum);
		});
	});

	describe("WORMHOLE_VISIBLE_TICK", () => {
		it("is at mid-game (~5 minutes at 60fps)", () => {
			// 18000 ticks / 60 fps = 300 seconds = 5 minutes
			expect(WORMHOLE_VISIBLE_TICK).toBe(18000);
		});
	});
});
