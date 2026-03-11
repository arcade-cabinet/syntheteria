import particlesConfig from "../particles.json";

describe("particles.json", () => {
	it("has positive max particles", () => {
		expect(particlesConfig.maxParticles).toBeGreaterThan(0);
	});

	const effects = Object.entries(particlesConfig.effects);

	it("has at least 5 particle effects", () => {
		expect(effects.length).toBeGreaterThanOrEqual(5);
	});

	it("each effect has required fields", () => {
		for (const [, effect] of effects) {
			expect(typeof effect.defaultDuration).toBe("number");
			expect(effect.defaultDuration).toBeGreaterThan(0);
			expect(typeof effect.defaultIntensity).toBe("number");
			expect(effect.defaultIntensity).toBeGreaterThan(0);
			expect(effect.defaultIntensity).toBeLessThanOrEqual(1);
			expect(typeof effect.defaultColor).toBe("string");
			expect(effect.defaultColor).toMatch(/^#[0-9a-fA-F]{6}$/);
			expect(effect.direction).toBeDefined();
			expect(typeof effect.direction.x).toBe("number");
			expect(typeof effect.direction.y).toBe("number");
			expect(typeof effect.direction.z).toBe("number");
		}
	});

	it("explosion has highest intensity", () => {
		expect(particlesConfig.effects.explosion.defaultIntensity).toBe(1.0);
	});

	it("lightning goes downward", () => {
		expect(particlesConfig.effects.lightning_strike.direction.y).toBeLessThan(0);
	});
});
