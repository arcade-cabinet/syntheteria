/**
 * ParticlePool — object pool for particle effects.
 *
 * Manages a fixed pool of particle instances using typed arrays for performance.
 * Each particle has: position (x,y,z), velocity (vx,vy,vz), color (r,g,b),
 * age, lifetime, size, sizeEnd, and opacity.
 *
 * The pool recycles dead particles automatically.
 *
 * Ported from pending/rendering/particles/ParticlePool.ts — zero external deps.
 */

export interface ParticleConfig {
	/** World position */
	x: number;
	y: number;
	z: number;
	/** Velocity in world units/second */
	vx: number;
	vy: number;
	vz: number;
	/** Color RGB (0-1) */
	r: number;
	g: number;
	b: number;
	/** Lifetime in seconds */
	lifetime: number;
	/** Start size */
	size: number;
	/** End size (lerps over lifetime) */
	sizeEnd: number;
	/** Gravity multiplier (1.0 = normal gravity) */
	gravity: number;
}

const GRAVITY = -9.8;

export class ParticlePool {
	readonly capacity: number;

	// SoA layout for cache-friendly iteration
	readonly posX: Float32Array;
	readonly posY: Float32Array;
	readonly posZ: Float32Array;
	readonly velX: Float32Array;
	readonly velY: Float32Array;
	readonly velZ: Float32Array;
	readonly colorR: Float32Array;
	readonly colorG: Float32Array;
	readonly colorB: Float32Array;
	readonly age: Float32Array;
	readonly lifetime: Float32Array;
	readonly size: Float32Array;
	readonly sizeEnd: Float32Array;
	readonly gravity: Float32Array;
	readonly alive: Uint8Array;

	activeCount = 0;

	constructor(capacity: number) {
		this.capacity = capacity;
		this.posX = new Float32Array(capacity);
		this.posY = new Float32Array(capacity);
		this.posZ = new Float32Array(capacity);
		this.velX = new Float32Array(capacity);
		this.velY = new Float32Array(capacity);
		this.velZ = new Float32Array(capacity);
		this.colorR = new Float32Array(capacity);
		this.colorG = new Float32Array(capacity);
		this.colorB = new Float32Array(capacity);
		this.age = new Float32Array(capacity);
		this.lifetime = new Float32Array(capacity);
		this.size = new Float32Array(capacity);
		this.sizeEnd = new Float32Array(capacity);
		this.gravity = new Float32Array(capacity);
		this.alive = new Uint8Array(capacity);
	}

	/**
	 * Emit a single particle. Returns the index or -1 if pool is full.
	 */
	emit(config: ParticleConfig): number {
		// Find first dead slot
		for (let i = 0; i < this.capacity; i++) {
			if (this.alive[i] === 0) {
				this.posX[i] = config.x;
				this.posY[i] = config.y;
				this.posZ[i] = config.z;
				this.velX[i] = config.vx;
				this.velY[i] = config.vy;
				this.velZ[i] = config.vz;
				this.colorR[i] = config.r;
				this.colorG[i] = config.g;
				this.colorB[i] = config.b;
				this.age[i] = 0;
				this.lifetime[i] = config.lifetime;
				this.size[i] = config.size;
				this.sizeEnd[i] = config.sizeEnd;
				this.gravity[i] = config.gravity;
				this.alive[i] = 1;
				this.activeCount++;
				return i;
			}
		}
		return -1;
	}

	/**
	 * Advance all particles by delta seconds.
	 */
	update(delta: number): void {
		let count = 0;
		for (let i = 0; i < this.capacity; i++) {
			if (this.alive[i] === 0) continue;

			this.age[i] += delta;
			if (this.age[i] >= this.lifetime[i]) {
				this.alive[i] = 0;
				continue;
			}

			// Physics
			this.velY[i] += GRAVITY * this.gravity[i] * delta;
			this.posX[i] += this.velX[i] * delta;
			this.posY[i] += this.velY[i] * delta;
			this.posZ[i] += this.velZ[i] * delta;

			// Floor clamp
			if (this.posY[i] < 0) {
				this.posY[i] = 0;
				this.velY[i] *= -0.3;
				this.velX[i] *= 0.8;
				this.velZ[i] *= 0.8;
			}

			count++;
		}
		this.activeCount = count;
	}

	/**
	 * Get the interpolated size at the current age for particle i.
	 */
	getCurrentSize(i: number): number {
		const t = this.age[i] / this.lifetime[i];
		return this.size[i] + (this.sizeEnd[i] - this.size[i]) * t;
	}

	/**
	 * Get opacity based on age (fade out in last 30%).
	 */
	getOpacity(i: number): number {
		const t = this.age[i] / this.lifetime[i];
		if (t > 0.7) {
			return 1.0 - (t - 0.7) / 0.3;
		}
		return 1.0;
	}

	/**
	 * Clear all particles.
	 */
	clear(): void {
		this.alive.fill(0);
		this.activeCount = 0;
	}
}
