import weatherConfig from "../config/weather.json";
import { gameplayRandom } from "../ecs/seed";
import { WorldPosition } from "../ecs/traits";
import { lightningRods } from "../ecs/world";
import { getWeatherSnapshot } from "./weather";

/**
 * Lightning bolt lifecycle system.
 *
 * Manages bolt scheduling, spawning, and expiration as pure game logic.
 * Runs each sim tick — no rendering, no React, no Three.js.
 *
 * The renderer (LightningRenderer.tsx) reads getLightningState() each frame
 * and draws the bolts. This system owns WHEN and WHERE bolts appear.
 * The renderer owns HOW they look.
 */

const cfg = weatherConfig.lightning;

// --- Types ---

export interface BoltPoint {
	x: number;
	y: number;
	z: number;
}

export interface BoltInstance {
	/** Points along the main bolt path */
	points: BoltPoint[];
	/** Branch paths */
	branches: BoltPoint[][];
	/** World position of strike endpoint */
	strikeX: number;
	strikeY: number;
	strikeZ: number;
	/** Sim tick when bolt was spawned */
	spawnTick: number;
	/** Whether this is a rod capture (amber) or ambient (blue-white) */
	isRodCapture: boolean;
}

export interface LightningState {
	/** Active bolts to render */
	activeBolts: readonly BoltInstance[];
	/** Current sim tick — renderer uses this to compute bolt age */
	currentTick: number;
	/** Duration constants for the renderer to compute opacity */
	strikeDuration: number;
	afterglowDuration: number;
	/** Color config for the renderer */
	colors: {
		ambient: readonly [number, number, number];
		rodCapture: readonly [number, number, number];
		flash: readonly [number, number, number];
	};
	/** Flash intensity config */
	flashIntensity: {
		ambient: number;
		rodCapture: number;
	};
	/** Flash distance config */
	flashDistance: {
		ambient: number;
		rodCapture: number;
	};
}

// --- Bolt geometry generation (pure functions) ---

/**
 * Generate a lightning bolt path from start to end using midpoint displacement.
 */
export function generateBoltPath(
	startX: number,
	startY: number,
	startZ: number,
	endX: number,
	endY: number,
	endZ: number,
	segments: number,
	displacement: number,
): BoltPoint[] {
	const points: BoltPoint[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		points.push({
			x: startX + (endX - startX) * t,
			y: startY + (endY - startY) * t,
			z: startZ + (endZ - startZ) * t,
		});
	}

	// Direction vector
	const dx = endX - startX;
	const dy = endY - startY;
	const dz = endZ - startZ;
	const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
	const dirX = dx / len;
	const dirZ = dz / len;

	// Perpendicular in XZ plane
	const perpX = -dirZ;
	const perpZ = dirX;

	for (let i = 1; i < points.length - 1; i++) {
		const lateralOffset = (gameplayRandom() - 0.5) * 2 * displacement;
		const forwardJitter = (gameplayRandom() - 0.5) * displacement * 0.3;
		points[i].x += perpX * lateralOffset + dirX * forwardJitter;
		points[i].z += perpZ * lateralOffset + dirZ * forwardJitter;
	}

	return points;
}

/**
 * Generate branch bolts from the main path.
 */
export function generateBranches(
	mainPath: BoltPoint[],
	branchChance: number,
): BoltPoint[][] {
	const branches: BoltPoint[][] = [];

	for (let i = 2; i < mainPath.length - 2; i++) {
		if (gameplayRandom() > branchChance) continue;

		const origin = mainPath[i];
		const bx = origin.x + (gameplayRandom() - 0.5) * 8;
		const by = origin.y - gameplayRandom() * 6;
		const bz = origin.z + (gameplayRandom() - 0.5) * 8;

		branches.push(
			generateBoltPath(
				origin.x,
				origin.y,
				origin.z,
				bx,
				by,
				bz,
				cfg.branchSegments,
				cfg.displacement * 0.4,
			),
		);
	}

	return branches;
}

/**
 * Create a complete bolt from sky to ground target.
 */
function createBolt(
	targetX: number,
	targetZ: number,
	tick: number,
	isRodCapture: boolean,
	targetY = 0,
): BoltInstance {
	const startX = targetX + (gameplayRandom() - 0.5) * 6;
	const startZ = targetZ + (gameplayRandom() - 0.5) * 6;

	const points = generateBoltPath(
		startX,
		cfg.skyHeight,
		startZ,
		targetX,
		targetY,
		targetZ,
		cfg.boltSegments,
		cfg.displacement,
	);

	const branchMult = isRodCapture ? cfg.rodCaptureBranchMultiplier : 1.0;
	const branches = generateBranches(points, cfg.branchChance * branchMult);

	return {
		points,
		branches,
		strikeX: targetX,
		strikeY: targetY,
		strikeZ: targetZ,
		spawnTick: tick,
		isRodCapture,
	};
}

// --- System state ---

let activeBolts: BoltInstance[] = [];
let currentSimTick = 0;
let nextAmbientTick = 0;
let lastRodCaptureTick = 0;

/** Camera position — updated by the renderer each frame */
let cameraX = 0;
let cameraZ = 0;

const TICKS_PER_SECOND = 60;

function durationToTicks(seconds: number): number {
	return Math.ceil(seconds * TICKS_PER_SECOND);
}

const totalDurationTicks = durationToTicks(
	cfg.strikeDuration + cfg.afterglowDuration,
);

function scheduleNextAmbient(tick: number): number {
	const weather = getWeatherSnapshot();
	const minTicks = durationToTicks(weather.stormVisuals.lightningIntervalMin);
	const maxTicks = durationToTicks(weather.stormVisuals.lightningIntervalMax);
	return tick + minTicks + Math.floor(gameplayRandom() * (maxTicks - minTicks));
}

// --- Public API ---

/**
 * Get current lightning state for the renderer.
 */
export function getLightningState(): LightningState {
	return {
		activeBolts,
		currentTick: currentSimTick,
		strikeDuration: cfg.strikeDuration,
		afterglowDuration: cfg.afterglowDuration,
		colors: {
			ambient: cfg.colors.ambient as [number, number, number],
			rodCapture: cfg.colors.rodCapture as [number, number, number],
			flash: cfg.colors.flash as [number, number, number],
		},
		flashIntensity: cfg.flashIntensity,
		flashDistance: cfg.flashDistance,
	};
}

/**
 * Update camera position for ambient strike targeting.
 * Called by the renderer each frame since only it has camera access.
 */
export function setLightningCameraPosition(x: number, z: number) {
	cameraX = x;
	cameraZ = z;
}

/**
 * Reset lightning system.
 */
export function resetLightningSystem() {
	activeBolts = [];
	currentSimTick = 0;
	nextAmbientTick = 0;
	lastRodCaptureTick = 0;
	cameraX = 0;
	cameraZ = 0;
}

/**
 * Run lightning system. Called once per sim tick.
 * Must be called AFTER weatherSystem so storm visuals config is current.
 */
export function lightningSystem(tick: number, stormIntensity: number) {
	currentSimTick = tick;

	// Initialize next ambient time on first tick
	if (nextAmbientTick === 0) {
		nextAmbientTick =
			tick +
			TICKS_PER_SECOND * 2 +
			Math.floor(gameplayRandom() * TICKS_PER_SECOND * 3);
	}

	// Expire old bolts
	activeBolts = activeBolts.filter(
		(b) => tick - b.spawnTick < totalDurationTicks,
	);

	// Spawn ambient distant strike
	if (tick >= nextAmbientTick && activeBolts.length < cfg.maxActiveBolts) {
		const angle = gameplayRandom() * Math.PI * 2;
		const dist =
			cfg.ambientMinDist +
			gameplayRandom() * (cfg.ambientMaxDist - cfg.ambientMinDist);
		const targetX = cameraX + Math.cos(angle) * dist;
		const targetZ = cameraZ + Math.sin(angle) * dist;

		activeBolts.push(createBolt(targetX, targetZ, tick, false));
		nextAmbientTick = scheduleNextAmbient(tick);
	}

	// Rod capture strikes during surges
	const weather = getWeatherSnapshot();
	const rodCooldownTicks = durationToTicks(cfg.rodCaptureCooldown);

	if (
		stormIntensity > cfg.rodSurgeThreshold &&
		tick - lastRodCaptureTick > rodCooldownTicks &&
		activeBolts.length < cfg.maxActiveBolts &&
		gameplayRandom() < weather.stormVisuals.rodCaptureChance
	) {
		const rods = Array.from(lightningRods);
		if (rods.length > 0) {
			const rod = rods[Math.floor(gameplayRandom() * rods.length)];
			const wp = rod.get(WorldPosition);
			if (wp) {
				activeBolts.push(createBolt(wp.x, wp.z, tick, true, wp.y + 2));
				lastRodCaptureTick = tick;
			}
		}
	}
}
