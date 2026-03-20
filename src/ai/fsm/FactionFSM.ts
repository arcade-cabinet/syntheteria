/**
 * Faction-level finite state machine for macro strategy.
 *
 * Each AI faction has one FSM that runs once per turn. The current state
 * outputs bias multipliers that scale GOAP evaluator weights, shifting
 * faction-wide priorities without replacing per-unit Think arbitration.
 *
 * States:
 *   EXPLORE  — scouts push outward, reveal territory
 *   EXPAND   — claim territory, build infrastructure
 *   FORTIFY  — group units, build turrets near base
 *   ATTACK   — push into enemy territory
 *   RETREAT  — emergency fallback when units < 3
 *
 * Based on Yuka's State/StateMachine pattern but adapted for
 * turn-based faction-level operation rather than per-entity real-time.
 */

// ---------------------------------------------------------------------------
// Bias overrides — multipliers applied to evaluator characterBias
// ---------------------------------------------------------------------------

export interface FactionBiasOverride {
	attack: number;
	chase: number;
	harvest: number;
	expand: number;
	build: number;
	scout: number;
	evade: number;
	idle: number;
}

const NEUTRAL_BIAS: FactionBiasOverride = {
	attack: 1,
	chase: 1,
	harvest: 1,
	expand: 1,
	build: 1,
	scout: 1,
	evade: 1,
	idle: 1,
};

// ---------------------------------------------------------------------------
// State context — data the FSM uses for transition decisions
// ---------------------------------------------------------------------------

export interface FactionStateContext {
	currentTurn: number;
	unitCount: number;
	popCap: number;
	/** Number of enemy/cult units within 5 tiles of any faction building. */
	nearbyThreats: number;
	/** Whether any enemy faction units have been contacted. */
	enemyFactionContacted: boolean;
	/** Fraction of board tiles the faction controls (0-1). */
	territoryPct: number;
	/** Number of buildings the faction has. */
	buildingCount: number;
	/** Motor pool count. */
	motorPoolCount: number;
}

// ---------------------------------------------------------------------------
// State IDs
// ---------------------------------------------------------------------------

export type FactionStateId =
	| "EXPLORE"
	| "EXPAND"
	| "FORTIFY"
	| "ATTACK"
	| "RETREAT";

// ---------------------------------------------------------------------------
// State definitions — each returns bias overrides
// ---------------------------------------------------------------------------

interface FactionState {
	/** Return bias overrides for this state. */
	getBias(): FactionBiasOverride;
	/** Check if should transition to another state. Returns null to stay. */
	checkTransition(ctx: FactionStateContext): FactionStateId | null;
}

const EXPLORE_STATE: FactionState = {
	getBias: () => ({
		...NEUTRAL_BIAS,
		scout: 1.8,
		expand: 1.4,
		harvest: 1.2,
		attack: 0.8,
		chase: 0.6,
		idle: 0.3,
	}),
	checkTransition(ctx) {
		if (ctx.unitCount < 3) return "RETREAT";
		if (ctx.nearbyThreats >= 3) return "FORTIFY";
		if (ctx.currentTurn >= 10) return "EXPAND";
		return null;
	},
};

const EXPAND_STATE: FactionState = {
	getBias: () => ({
		...NEUTRAL_BIAS,
		build: 1.8,
		expand: 1.6,
		harvest: 1.5,
		scout: 1.4,
		attack: 1.3,
		chase: 1.3,
		evade: 1.0,
		idle: 0.1, // Idle must NEVER win in EXPAND — all productive actions dominate
	}),
	checkTransition(ctx) {
		if (ctx.unitCount < 3) return "RETREAT";
		if (ctx.nearbyThreats >= 3) return "FORTIFY";
		if (
			ctx.currentTurn >= 40 &&
			ctx.enemyFactionContacted &&
			ctx.unitCount > 8
		) {
			return "ATTACK";
		}
		return null;
	},
};

const FORTIFY_STATE: FactionState = {
	getBias: () => ({
		...NEUTRAL_BIAS,
		build: 1.5,
		evade: 1.4,
		idle: 1.2,
		harvest: 1.0,
		attack: 0.8,
		scout: 0.5,
		expand: 0.5,
	}),
	checkTransition(ctx) {
		if (ctx.unitCount < 3) return "RETREAT";
		// De-escalate if threats gone and enough units
		if (ctx.nearbyThreats === 0 && ctx.unitCount > 5) {
			if (ctx.currentTurn >= 40 && ctx.enemyFactionContacted) {
				return "ATTACK";
			}
			return "EXPAND";
		}
		return null;
	},
};

const ATTACK_STATE: FactionState = {
	getBias: () => ({
		...NEUTRAL_BIAS,
		attack: 1.8,
		chase: 1.6,
		expand: 1.2,
		scout: 0.6,
		harvest: 0.7,
		build: 0.8,
		evade: 0.5,
		idle: 0.2,
	}),
	checkTransition(ctx) {
		if (ctx.unitCount < 3) return "RETREAT";
		if (ctx.nearbyThreats >= 5 && ctx.unitCount <= 6) return "FORTIFY";
		// Fall back to expand if army is too small to attack
		if (ctx.unitCount <= 5) return "EXPAND";
		return null;
	},
};

const RETREAT_STATE: FactionState = {
	getBias: () => ({
		...NEUTRAL_BIAS,
		evade: 2.0,
		harvest: 1.3,
		build: 1.2,
		idle: 1.0,
		attack: 0.3,
		chase: 0.2,
		scout: 0.3,
		expand: 0.3,
	}),
	checkTransition(ctx) {
		// Leave retreat when army is rebuilt
		if (ctx.unitCount >= 5) {
			if (ctx.nearbyThreats >= 3) return "FORTIFY";
			if (ctx.currentTurn < 15) return "EXPLORE";
			return "EXPAND";
		}
		return null;
	},
};

const STATE_MAP: Record<FactionStateId, FactionState> = {
	EXPLORE: EXPLORE_STATE,
	EXPAND: EXPAND_STATE,
	FORTIFY: FORTIFY_STATE,
	ATTACK: ATTACK_STATE,
	RETREAT: RETREAT_STATE,
};

// ---------------------------------------------------------------------------
// Faction State Machine
// ---------------------------------------------------------------------------

export class FactionFSM {
	currentStateId: FactionStateId;
	previousStateId: FactionStateId | null = null;

	constructor(initialState: FactionStateId = "EXPLORE") {
		this.currentStateId = initialState;
	}

	/** Evaluate transitions and return bias overrides for this turn. */
	update(ctx: FactionStateContext): FactionBiasOverride {
		const state = STATE_MAP[this.currentStateId];
		const nextState = state.checkTransition(ctx);

		if (nextState !== null && nextState !== this.currentStateId) {
			this.previousStateId = this.currentStateId;
			this.currentStateId = nextState;
		}

		return STATE_MAP[this.currentStateId].getBias();
	}

	/** Get current bias without running transitions. */
	getBias(): FactionBiasOverride {
		return STATE_MAP[this.currentStateId].getBias();
	}
}

// ---------------------------------------------------------------------------
// FSM Registry — one FSM per AI faction, persists across turns
// ---------------------------------------------------------------------------

const _factionFSMs = new Map<string, FactionFSM>();

export function getFactionFSM(factionId: string): FactionFSM {
	let fsm = _factionFSMs.get(factionId);
	if (!fsm) {
		fsm = new FactionFSM();
		_factionFSMs.set(factionId, fsm);
	}
	return fsm;
}

export function resetFactionFSMs(): void {
	_factionFSMs.clear();
}
