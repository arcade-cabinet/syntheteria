/**
 * AI peace period / pacing system — controls when AI factions become threats.
 *
 * Paper playtesting found that players need a grace period at game start to
 * establish before AI civilizations become aggressive. This system manages
 * AI aggression pacing through five sequential phases:
 *
 *   peace → scouting → contested → warfare → endgame
 *
 * Phase durations are difficulty-dependent. Within each phase, aggression
 * ramps linearly from the phase's base level to the next phase's base.
 * Raid permission and cooldowns are phase-gated.
 *
 * Integrates with raidSystem (canRaid gate) and aiCivilization (governor bias
 * scaling by aggression level).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIPhase =
	| "peace"
	| "scouting"
	| "contested"
	| "warfare"
	| "endgame";

export type Difficulty = "easy" | "normal" | "hard" | "brutal";

export interface FactionPacing {
	factionId: string;
	currentPhase: AIPhase;
	phaseStartTime: number;
	aggressionLevel: number;
	raidCooldown: number;
	lastRaidTime: number;
	totalRaidsLaunched: number;
	peaceExpired: boolean;
}

// ---------------------------------------------------------------------------
// Phase ordering
// ---------------------------------------------------------------------------

const PHASE_ORDER: AIPhase[] = [
	"peace",
	"scouting",
	"contested",
	"warfare",
	"endgame",
];

// ---------------------------------------------------------------------------
// Phase durations per difficulty (game-seconds)
// Infinity means the phase lasts forever (endgame on easy/normal).
// ---------------------------------------------------------------------------

const PHASE_DURATIONS: Record<Difficulty, Record<AIPhase, number>> = {
	easy: {
		peace: 600,
		scouting: 300,
		contested: 600,
		warfare: 900,
		endgame: Number.POSITIVE_INFINITY,
	},
	normal: {
		peace: 300,
		scouting: 180,
		contested: 300,
		warfare: 600,
		endgame: Number.POSITIVE_INFINITY,
	},
	hard: {
		peace: 120,
		scouting: 120,
		contested: 180,
		warfare: 300,
		endgame: 600,
	},
	brutal: {
		peace: 60,
		scouting: 60,
		contested: 60,
		warfare: 120,
		endgame: 300,
	},
};

// ---------------------------------------------------------------------------
// Raid cooldowns per phase (seconds). -1 = cannot raid.
// ---------------------------------------------------------------------------

const RAID_COOLDOWNS: Record<AIPhase, number> = {
	peace: -1,
	scouting: -1,
	contested: 300,
	warfare: 180,
	endgame: 60,
};

// ---------------------------------------------------------------------------
// Aggression base levels per phase (0-1 range).
// Within a phase, aggression ramps linearly from this phase's base
// to the next phase's base over the phase duration.
// ---------------------------------------------------------------------------

const AGGRESSION_BASE: Record<AIPhase, number> = {
	peace: 0,
	scouting: 0.15,
	contested: 0.4,
	warfare: 0.7,
	endgame: 1.0,
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const factions = new Map<string, { pacing: FactionPacing; difficulty: Difficulty }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function phaseIndex(phase: AIPhase): number {
	return PHASE_ORDER.indexOf(phase);
}

function nextPhase(phase: AIPhase): AIPhase | null {
	const idx = phaseIndex(phase);
	if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
	return PHASE_ORDER[idx + 1];
}

function phaseDuration(difficulty: Difficulty, phase: AIPhase): number {
	return PHASE_DURATIONS[difficulty][phase];
}

function computeAggression(
	phase: AIPhase,
	difficulty: Difficulty,
	timeInPhase: number,
): number {
	const base = AGGRESSION_BASE[phase];
	const next = nextPhase(phase);
	const ceiling = next ? AGGRESSION_BASE[next] : 1.0;
	const duration = phaseDuration(difficulty, phase);

	if (!Number.isFinite(duration) || duration <= 0) {
		return base;
	}

	const t = Math.min(1, timeInPhase / duration);
	return base + (ceiling - base) * t;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a faction with a given difficulty. Must be called before
 * updatePacing will advance this faction.
 */
export function registerFaction(factionId: string, difficulty: string): void {
	const diff = difficulty as Difficulty;
	if (!PHASE_DURATIONS[diff]) {
		throw new Error(`Unknown difficulty: ${difficulty}`);
	}

	const pacing: FactionPacing = {
		factionId,
		currentPhase: "peace",
		phaseStartTime: 0,
		aggressionLevel: 0,
		raidCooldown: RAID_COOLDOWNS.peace,
		lastRaidTime: -Infinity,
		totalRaidsLaunched: 0,
		peaceExpired: false,
	};

	factions.set(factionId, { pacing, difficulty: diff });
}

/**
 * Advance all registered factions through their pacing phases.
 * Call once per game-time update with the current game time in seconds.
 * Handles large time jumps that skip multiple phases.
 */
export function updatePacing(currentTime: number): void {
	for (const entry of factions.values()) {
		const { pacing, difficulty } = entry;

		// Loop to handle time jumps that skip multiple phases
		let advancing = true;
		while (advancing) {
			const duration = phaseDuration(difficulty, pacing.currentPhase);
			const elapsed = currentTime - pacing.phaseStartTime;

			if (Number.isFinite(duration) && elapsed >= duration) {
				const next = nextPhase(pacing.currentPhase);
				if (next) {
					pacing.currentPhase = next;
					pacing.phaseStartTime = pacing.phaseStartTime + duration;
					pacing.raidCooldown = RAID_COOLDOWNS[next];

					if (next !== "peace") {
						pacing.peaceExpired = true;
					}
				} else {
					advancing = false;
				}
			} else {
				advancing = false;
			}
		}

		// Update aggression
		const timeInPhase = currentTime - pacing.phaseStartTime;
		pacing.aggressionLevel = computeAggression(
			pacing.currentPhase,
			difficulty,
			timeInPhase,
		);
	}
}

/**
 * Get the full pacing state for a faction.
 */
export function getFactionPacing(factionId: string): FactionPacing | null {
	const entry = factions.get(factionId);
	return entry ? { ...entry.pacing } : null;
}

/**
 * Get the current AI phase for a faction.
 */
export function getCurrentPhase(factionId: string): AIPhase {
	const entry = factions.get(factionId);
	if (!entry) return "peace";
	return entry.pacing.currentPhase;
}

/**
 * Check whether a faction is allowed to launch a raid right now.
 * Respects both phase restrictions and raid cooldown timers.
 */
export function canRaid(factionId: string, currentTime: number): boolean {
	const entry = factions.get(factionId);
	if (!entry) return false;

	const { pacing } = entry;
	const cooldown = RAID_COOLDOWNS[pacing.currentPhase];

	// Phase does not allow raids
	if (cooldown < 0) return false;

	// Cooldown not yet elapsed
	if (currentTime - pacing.lastRaidTime < cooldown) return false;

	return true;
}

/**
 * Record that a raid was launched by this faction.
 */
export function recordRaid(factionId: string, currentTime: number): void {
	const entry = factions.get(factionId);
	if (!entry) return;

	entry.pacing.lastRaidTime = currentTime;
	entry.pacing.totalRaidsLaunched++;
}

/**
 * Get the current aggression level (0-1) for a faction.
 */
export function getAggressionLevel(factionId: string): number {
	const entry = factions.get(factionId);
	if (!entry) return 0;
	return entry.pacing.aggressionLevel;
}

/**
 * Check whether a faction is still in the initial peace period.
 */
export function isInPeacePeriod(factionId: string): boolean {
	const entry = factions.get(factionId);
	if (!entry) return true;
	return entry.pacing.currentPhase === "peace";
}

/**
 * Force a faction into a specific phase, overriding normal progression.
 * Useful for events like the player attacking an AI faction early.
 */
export function forcePhase(
	factionId: string,
	phase: AIPhase,
	currentTime: number,
): void {
	const entry = factions.get(factionId);
	if (!entry) return;

	entry.pacing.currentPhase = phase;
	entry.pacing.phaseStartTime = currentTime;
	entry.pacing.raidCooldown = RAID_COOLDOWNS[phase];

	if (phase !== "peace") {
		entry.pacing.peaceExpired = true;
	}

	// Recompute aggression at the start of the new phase
	entry.pacing.aggressionLevel = computeAggression(phase, entry.difficulty, 0);
}

/**
 * Get pacing state for all registered factions.
 */
export function getAllFactionPacings(): FactionPacing[] {
	return Array.from(factions.values()).map((e) => ({ ...e.pacing }));
}

/**
 * Reset all pacing state. For tests and new-game initialization.
 */
export function reset(): void {
	factions.clear();
}
