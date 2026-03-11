/**
 * Ancient Machines awakening system — Residual sentient natives of Ferrathis.
 *
 * The Residuals (Sentinels, Crawlers, and the Colossus) are the planet's
 * indigenous machine consciousness. They are neutral by default and awaken
 * when the player damages the deep substrate through aggressive mining or
 * building over Core Access Points.
 *
 * Awakening is driven by a `substrateDamage` counter:
 *   - Mining near sacred sites increments it
 *   - Destroying Sentinels/Crawlers increments it heavily
 *   - Building outposts over Core Access Points spikes it
 *   - Damage decays slowly each tick when no disruption occurs
 *
 * Residual HP scales with `threatLevel` (0–1), so the consciousness
 * responds more powerfully as the player proves more dangerous.
 *
 * The Colossus only wakes at extreme substrate damage or via story
 * progression flag. Its awakening is a planet-wide crisis, not a
 * standard combat encounter.
 *
 * Tunables sourced from config/enemies.json (ancientMachines section).
 *
 * Module-level state with _resetAncientMachineState() for test cleanup.
 */

import enemiesConfig from "../../config/enemies.json";
import { emit } from "./eventBus";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const cfg = enemiesConfig.ancientMachines;
const awakeningCfg = cfg.awakening;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResidualType = "sentinel" | "crawler" | "colossus";

export type ResidualRelationship = "dormant" | "neutral" | "hostile" | "cooperative";

export interface ResidualEntity {
	/** Unique entity ID */
	id: string;
	/** Residual archetype */
	type: ResidualType;
	/** Current HP */
	hp: number;
	/** Maximum HP (scaled from config range by threat level at spawn) */
	maxHp: number;
	/** World position */
	position: { x: number; y: number; z: number };
	/** Damage dealt per attack */
	damage: number;
	/** Attack range in meters */
	range: number;
	/** Current relationship with colonists */
	relationship: ResidualRelationship;
	/** Tick this entity was awakened */
	awakenedTick: number;
}

export interface AncientMachineState {
	/** Running total of substrate damage (decays each tick) */
	substrateDamage: number;
	/** Residual relationship score: −100 (hostile) to +100 (cooperative) */
	relationshipScore: number;
	/** Whether the Colossus has been awakened this game */
	colossusAwakened: boolean;
	/** Awakened Residual entities, keyed by entity ID */
	activeResiduals: Map<string, ResidualEntity>;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let substrateDamage = 0;
let relationshipScore = 0;
let colossusAwakened = false;
let nextEntityId = 0;
const activeResiduals = new Map<string, ResidualEntity>();
let _currentTick = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Interpolate a value between min and max based on threatLevel (0.0–1.0).
 * A higher threatLevel means the Residuals manifest with greater capability.
 */
function scaleByThreat(min: number, max: number, threatLevel: number): number {
	const clamped = Math.max(0, Math.min(1, threatLevel));
	return Math.round(min + (max - min) * clamped);
}

/**
 * Compute current threat level as a ratio of substrate damage to the
 * Colossus awakening threshold (0.0–1.0).
 */
function getThreatLevel(): number {
	return Math.min(substrateDamage / awakeningCfg.colossusAwakeThreshold, 1.0);
}

function makeEntityId(): string {
	return `residual_${nextEntityId++}`;
}

function safeEmit(event: Parameters<typeof emit>[0]): void {
	try {
		emit(event);
	} catch {
		// Never crash gameplay from event emission
	}
}

// ---------------------------------------------------------------------------
// Substrate damage
// ---------------------------------------------------------------------------

/**
 * Record substrate damage from a colonist action.
 *
 * Valid causes:
 * - "mining"                  — increments by substrateDamagePerMiningTick
 * - "building_over_access"    — increments by substrateDamagePerBuildOverAccess
 * - "sentinel_destroyed"      — increments by substrateDamagePerSentinelDestroyed
 * - "crawler_destroyed"       — increments by substrateDamagePerCrawlerDestroyed
 *
 * @returns New total substrate damage
 */
export function recordSubstrateDamage(
	cause: "mining" | "building_over_access" | "sentinel_destroyed" | "crawler_destroyed",
	tick: number,
): number {
	const amounts: Record<string, number> = {
		mining: awakeningCfg.substrateDamagePerMiningTick,
		building_over_access: awakeningCfg.substrateDamagePerBuildOverAccess,
		sentinel_destroyed: awakeningCfg.substrateDamagePerSentinelDestroyed,
		crawler_destroyed: awakeningCfg.substrateDamagePerCrawlerDestroyed,
	};

	const amount = amounts[cause] ?? 0;
	substrateDamage += amount;

	safeEmit({
		type: "substrate_damaged",
		cause,
		amount,
		totalDamage: substrateDamage,
		tick,
	});

	return substrateDamage;
}

/**
 * Decay substrate damage by the configured rate.
 * Call once per game tick during normal tick update.
 */
export function decaySubstrateDamage(): void {
	substrateDamage = Math.max(
		0,
		substrateDamage - awakeningCfg.substrateDamageDecayPerTick,
	);
}

// ---------------------------------------------------------------------------
// Relationship
// ---------------------------------------------------------------------------

/**
 * Adjust the player's relationship score with the Residuals.
 * Clamped to [−100, +100].
 *
 * @param delta  — Positive = more friendly, negative = more hostile
 * @param cause  — Human-readable label for event emission
 */
export function adjustRelationship(delta: number, cause: string, tick: number): number {
	const prev = relationshipScore;
	relationshipScore = Math.max(-100, Math.min(100, relationshipScore + delta));

	safeEmit({
		type: "residual_relationship_changed",
		newScore: relationshipScore,
		delta: relationshipScore - prev,
		cause,
		tick,
	});

	return relationshipScore;
}

/** Get current Residual relationship score. */
export function getRelationshipScore(): number {
	return relationshipScore;
}

// ---------------------------------------------------------------------------
// Awakening
// ---------------------------------------------------------------------------

/**
 * Check awakening thresholds and spawn new Residual entities if needed.
 * Call once per game tick.
 *
 * @param position — World position near which new entities spawn (e.g. player position)
 * @param tick     — Current game tick
 * @param storyFlags — Set of active story progression flags
 */
export function checkAwakening(
	position: { x: number; y: number; z: number },
	tick: number,
	storyFlags: Set<string> = new Set(),
): ResidualEntity[] {
	_currentTick = tick;
	const spawned: ResidualEntity[] = [];
	const threat = getThreatLevel();

	// Sentinel awakening
	const activeSentinels = [...activeResiduals.values()].filter(
		(e) => e.type === "sentinel",
	);
	if (
		substrateDamage >= awakeningCfg.sentinelAwakeThreshold &&
		activeSentinels.length < awakeningCfg.maxActiveSentinels
	) {
		const sentinel = spawnResidual("sentinel", position, threat, tick);
		spawned.push(sentinel);
	}

	// Crawler awakening
	const activeCrawlers = [...activeResiduals.values()].filter(
		(e) => e.type === "crawler",
	);
	if (
		substrateDamage >= awakeningCfg.crawlerAwakeThreshold &&
		activeCrawlers.length < awakeningCfg.maxActiveCrawlers
	) {
		const crawler = spawnResidual("crawler", position, threat, tick);
		spawned.push(crawler);
	}

	// Colossus awakening — extreme damage or story flag, only once
	if (
		!colossusAwakened &&
		(substrateDamage >= awakeningCfg.colossusAwakeThreshold ||
			storyFlags.has(cfg.colossus.awakeningConditions.storyProgressionFlag))
	) {
		const colossus = spawnResidual("colossus", position, 1.0, tick);
		colossusAwakened = true;
		spawned.push(colossus);
	}

	return spawned;
}

/**
 * Spawn a single Residual entity and register it.
 * HP is scaled from the config range by the current threat level.
 */
function spawnResidual(
	type: ResidualType,
	position: { x: number; y: number; z: number },
	threatLevel: number,
	tick: number,
): ResidualEntity {
	const typeCfg = cfg[type] as {
		hpMin?: number;
		hpMax?: number;
		hp?: number;
		damageMin: number;
		damageMax: number;
		range: number;
		defaultRelationship: string;
	};

	const hpMin = typeCfg.hpMin ?? typeCfg.hp ?? 0;
	const hpMax = typeCfg.hpMax ?? typeCfg.hp ?? 0;
	const hp = scaleByThreat(hpMin, hpMax, threatLevel);
	const damage = scaleByThreat(typeCfg.damageMin, typeCfg.damageMax, threatLevel);

	const entity: ResidualEntity = {
		id: makeEntityId(),
		type,
		hp,
		maxHp: hp,
		position: { ...position },
		damage,
		range: typeCfg.range,
		relationship: typeCfg.defaultRelationship as ResidualRelationship,
		awakenedTick: tick,
	};

	activeResiduals.set(entity.id, entity);

	safeEmit({
		type: "ancient_machine_awakened",
		entityId: entity.id,
		machineType: type,
		position,
		substrateDamage,
		tick,
	});

	return entity;
}

// ---------------------------------------------------------------------------
// Tick update
// ---------------------------------------------------------------------------

/**
 * Main per-tick update. Call from the game loop.
 * Handles:
 * - Substrate damage decay
 * - Despawning entities that have exceeded their active lifetime
 *
 * @param tick — Current game tick
 * @returns IDs of entities that were despawned this tick
 */
export function updateAncientMachines(tick: number): string[] {
	_currentTick = tick;
	decaySubstrateDamage();

	const despawned: string[] = [];
	for (const [id, entity] of activeResiduals) {
		const age = tick - entity.awakenedTick;
		if (age >= awakeningCfg.despawnAfterTicks && entity.type !== "colossus") {
			activeResiduals.delete(id);
			despawned.push(id);
		}
	}

	return despawned;
}

// ---------------------------------------------------------------------------
// Damage and death
// ---------------------------------------------------------------------------

/**
 * Apply damage to a Residual entity.
 *
 * When a Sentinel or Crawler is destroyed, substrate damage is recorded
 * and the relationship score is penalized.
 *
 * @returns true if the entity was destroyed
 */
export function damageResidual(entityId: string, amount: number, tick: number): boolean {
	const entity = activeResiduals.get(entityId);
	if (!entity) return false;

	entity.hp = Math.max(0, entity.hp - amount);

	if (entity.hp === 0) {
		activeResiduals.delete(entityId);

		const cause =
			entity.type === "sentinel" ? "sentinel_destroyed" : "crawler_destroyed";

		if (entity.type !== "colossus") {
			recordSubstrateDamage(
				cause as "sentinel_destroyed" | "crawler_destroyed",
				tick,
			);

			const penalty =
				entity.type === "sentinel"
					? cfg.sentinel.relationshipPenalty
					: cfg.crawler.relationshipPenalty;

			adjustRelationship(-penalty, `${entity.type}_killed`, tick);
		}

		return true;
	}

	return false;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Get all currently active Residual entities. */
export function getActiveResiduals(): ResidualEntity[] {
	return [...activeResiduals.values()];
}

/** Get a single Residual entity by ID, or undefined. */
export function getResidual(entityId: string): ResidualEntity | undefined {
	return activeResiduals.get(entityId);
}

/** Get current substrate damage level. */
export function getSubstrateDamage(): number {
	return substrateDamage;
}

/** Get the current threat level (0.0–1.0). */
export function getCurrentThreatLevel(): number {
	return getThreatLevel();
}

/** Whether the Colossus has awakened this game. */
export function isColossusAwakened(): boolean {
	return colossusAwakened;
}

/**
 * Get integration progress for the Colossus victory path.
 * Returns a value from 0–1 indicating how close the player is to
 * the Integration Victory conditions.
 */
export function getIntegrationProgress(): {
	relationshipProgress: number;
	isEligible: boolean;
} {
	const colossusIntegration = cfg.colossus.integrationConditions;
	const relationshipProgress = Math.max(
		0,
		Math.min(1, relationshipScore / colossusIntegration.relationshipThreshold),
	);
	const isEligible = relationshipScore >= colossusIntegration.relationshipThreshold;

	return { relationshipProgress, isEligible };
}

// ---------------------------------------------------------------------------
// Test reset
// ---------------------------------------------------------------------------

/** Reset all module-level state. For testing only. */
export function _resetAncientMachineState(): void {
	substrateDamage = 0;
	relationshipScore = 0;
	colossusAwakened = false;
	nextEntityId = 0;
	activeResiduals.clear();
	_currentTick = 0;
}
