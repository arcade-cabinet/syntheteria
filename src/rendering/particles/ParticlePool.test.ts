import { type ParticleConfig, ParticlePool } from "./ParticlePool";

function makeConfig(overrides: Partial<ParticleConfig> = {}): ParticleConfig {
	return {
		x: 0,
		y: 1,
		z: 0,
		vx: 1,
		vy: 2,
		vz: 0,
		r: 1,
		g: 0,
		b: 0,
		lifetime: 1.0,
		size: 0.1,
		sizeEnd: 0.01,
		gravity: 1.0,
		...overrides,
	};
}

describe("ParticlePool", () => {
	it("creates pool with specified capacity", () => {
		const pool = new ParticlePool(64);
		expect(pool.capacity).toBe(64);
		expect(pool.activeCount).toBe(0);
	});

	it("emits a particle and increments active count", () => {
		const pool = new ParticlePool(16);
		const idx = pool.emit(makeConfig());
		expect(idx).toBe(0);
		expect(pool.activeCount).toBe(1);
		expect(pool.alive[0]).toBe(1);
	});

	it("stores particle position and velocity", () => {
		const pool = new ParticlePool(16);
		pool.emit(makeConfig({ x: 5, y: 3, z: -2, vx: 1, vy: -1, vz: 0.5 }));
		expect(pool.posX[0]).toBe(5);
		expect(pool.posY[0]).toBe(3);
		expect(pool.posZ[0]).toBe(-2);
		expect(pool.velX[0]).toBe(1);
		expect(pool.velY[0]).toBe(-1);
		expect(pool.velZ[0]).toBe(0.5);
	});

	it("stores particle color", () => {
		const pool = new ParticlePool(16);
		pool.emit(makeConfig({ r: 0.5, g: 0.3, b: 0.8 }));
		expect(pool.colorR[0]).toBeCloseTo(0.5);
		expect(pool.colorG[0]).toBeCloseTo(0.3);
		expect(pool.colorB[0]).toBeCloseTo(0.8);
	});

	it("returns -1 when pool is full", () => {
		const pool = new ParticlePool(2);
		pool.emit(makeConfig());
		pool.emit(makeConfig());
		const idx = pool.emit(makeConfig());
		expect(idx).toBe(-1);
	});

	it("recycles dead slots", () => {
		const pool = new ParticlePool(2);
		pool.emit(makeConfig({ lifetime: 0.1 }));
		pool.emit(makeConfig({ lifetime: 5.0 }));

		// Advance past first particle's lifetime
		pool.update(0.2);

		// First slot should now be dead, second still alive
		expect(pool.alive[0]).toBe(0);
		expect(pool.alive[1]).toBe(1);
		expect(pool.activeCount).toBe(1);

		// Should be able to emit into the recycled slot
		const idx = pool.emit(makeConfig());
		expect(idx).toBe(0);
		expect(pool.activeCount).toBe(2);
	});

	it("advances position by velocity over time", () => {
		const pool = new ParticlePool(4);
		pool.emit(
			makeConfig({ x: 0, y: 10, z: 0, vx: 2, vy: 0, vz: 3, gravity: 0 }),
		);
		pool.update(0.5);

		expect(pool.posX[0]).toBeCloseTo(1.0); // 0 + 2*0.5
		expect(pool.posZ[0]).toBeCloseTo(1.5); // 0 + 3*0.5
	});

	it("applies gravity to vertical velocity", () => {
		const pool = new ParticlePool(4);
		pool.emit(
			makeConfig({ x: 0, y: 10, z: 0, vx: 0, vy: 0, vz: 0, gravity: 1.0 }),
		);
		pool.update(0.5);

		// Gravity = -9.8, so after 0.5s: vy = 0 + (-9.8 * 1.0 * 0.5) = -4.9
		expect(pool.velY[0]).toBeCloseTo(-4.9);
		// Position: y = 10 + (-4.9 * 0.5) = 10 - 2.45 = 7.55
		expect(pool.posY[0]).toBeCloseTo(7.55);
	});

	it("bounces particles off floor (y=0)", () => {
		const pool = new ParticlePool(4);
		pool.emit(
			makeConfig({ x: 0, y: 0.1, z: 0, vx: 1, vy: -5, vz: 0, gravity: 0 }),
		);
		pool.update(0.1);

		// After 0.1s: y = 0.1 + (-5 * 0.1) = -0.4, clamped to 0
		expect(pool.posY[0]).toBe(0);
		// Velocity should be reversed and dampened
		expect(pool.velY[0]).toBeCloseTo(5 * 0.3);
		expect(pool.velX[0]).toBeCloseTo(1 * 0.8);
	});

	it("kills particles past their lifetime", () => {
		const pool = new ParticlePool(4);
		pool.emit(makeConfig({ lifetime: 0.5 }));
		expect(pool.activeCount).toBe(1);

		pool.update(0.3);
		expect(pool.activeCount).toBe(1);

		pool.update(0.3);
		expect(pool.activeCount).toBe(0);
		expect(pool.alive[0]).toBe(0);
	});

	it("getCurrentSize interpolates between start and end", () => {
		const pool = new ParticlePool(4);
		pool.emit(makeConfig({ size: 1.0, sizeEnd: 0.0, lifetime: 1.0 }));

		// At t=0, size should be 1.0
		expect(pool.getCurrentSize(0)).toBeCloseTo(1.0);

		// Advance halfway
		pool.update(0.5);
		expect(pool.getCurrentSize(0)).toBeCloseTo(0.5);
	});

	it("getOpacity fades out in last 30%", () => {
		const pool = new ParticlePool(4);
		pool.emit(makeConfig({ lifetime: 1.0 }));

		// At t=0: full opacity
		expect(pool.getOpacity(0)).toBeCloseTo(1.0);

		// At 50% life: still full
		pool.update(0.5);
		expect(pool.getOpacity(0)).toBeCloseTo(1.0);

		// At 85% life (in the fade zone): partial opacity
		pool.update(0.35);
		const opacity85 = pool.getOpacity(0);
		expect(opacity85).toBeLessThan(1.0);
		expect(opacity85).toBeGreaterThan(0);
	});

	it("clear removes all particles", () => {
		const pool = new ParticlePool(8);
		pool.emit(makeConfig());
		pool.emit(makeConfig());
		pool.emit(makeConfig());
		expect(pool.activeCount).toBe(3);

		pool.clear();
		expect(pool.activeCount).toBe(0);
		expect(pool.alive[0]).toBe(0);
		expect(pool.alive[1]).toBe(0);
		expect(pool.alive[2]).toBe(0);
	});

	it("handles multiple emits and updates correctly", () => {
		const pool = new ParticlePool(16);

		// Emit 5 particles with different lifetimes
		pool.emit(makeConfig({ lifetime: 0.1 }));
		pool.emit(makeConfig({ lifetime: 0.5 }));
		pool.emit(makeConfig({ lifetime: 1.0 }));
		pool.emit(makeConfig({ lifetime: 2.0 }));
		pool.emit(makeConfig({ lifetime: 3.0 }));
		expect(pool.activeCount).toBe(5);

		// After 0.2s: first particle dead
		pool.update(0.2);
		expect(pool.activeCount).toBe(4);

		// After another 0.4s: second dead too
		pool.update(0.4);
		expect(pool.activeCount).toBe(3);
	});

	it("does not crash on update with empty pool", () => {
		const pool = new ParticlePool(8);
		pool.update(0.016);
		expect(pool.activeCount).toBe(0);
	});

	it("zero gravity particles float straight", () => {
		const pool = new ParticlePool(4);
		pool.emit(
			makeConfig({
				x: 0,
				y: 1,
				z: 0,
				vx: 0,
				vy: 1,
				vz: 0,
				gravity: 0,
				lifetime: 5.0,
			}),
		);
		pool.update(1.0);

		// No gravity, so y should simply be 1 + 1*1 = 2
		expect(pool.posY[0]).toBeCloseTo(2.0);
		expect(pool.velY[0]).toBeCloseTo(1.0); // unchanged
	});
});
