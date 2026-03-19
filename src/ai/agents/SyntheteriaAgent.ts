/**
 * SyntheteriaAgent — extends Yuka Vehicle, owns a Think brain.
 *
 * Each AI-controlled unit gets one agent. The Think brain holds
 * GoalEvaluators whose characterBias values come from the faction's
 * personality profile (aggression, harvestPriority, etc).
 */

import type { GoalEvaluator } from "yuka";
import { Think, Vehicle } from "yuka";

export interface AgentSnapshot {
	entityId: number;
	factionId: string;
	tileX: number;
	tileZ: number;
	hp: number;
	ap: number;
	maxAp: number;
	mp: number;
	maxMp: number;
	scanRange: number;
	attackRange: number;
	attack: number;
	defense: number;
}

export class SyntheteriaAgent extends Vehicle {
	readonly entityId: number;
	readonly factionId: string;
	brain: Think<SyntheteriaAgent>;

	// Snapshot of ECS state — refreshed each turn
	tileX = 0;
	tileZ = 0;
	hp = 10;
	ap = 2;
	maxAp = 2;
	mp = 3;
	maxMp = 3;
	scanRange = 4;
	attackRange = 1;
	attack = 2;
	defense = 0;

	// Result of brain arbitration — what this agent decided to do
	decidedAction: DecidedAction | null = null;

	// Last action type from previous turn — used for momentum bonus
	lastActionType: string | null = null;

	constructor(entityId: number, factionId: string) {
		super();
		this.entityId = entityId;
		this.factionId = factionId;
		this.brain = new Think(this);
	}

	addEvaluator(evaluator: GoalEvaluator<SyntheteriaAgent>): this {
		this.brain.addEvaluator(evaluator);
		return this;
	}

	/** Sync agent state from ECS snapshot. */
	syncFromSnapshot(snap: AgentSnapshot): void {
		this.tileX = snap.tileX;
		this.tileZ = snap.tileZ;
		this.hp = snap.hp;
		this.ap = snap.ap;
		this.maxAp = snap.maxAp;
		this.mp = snap.mp;
		this.maxMp = snap.maxMp;
		this.scanRange = snap.scanRange;
		this.attackRange = snap.attackRange;
		this.attack = snap.attack;
		this.defense = snap.defense;
	}

	/** Run the Think brain's arbitration to decide the best action. */
	arbitrate(): void {
		this.decidedAction = null;
		this.brain.arbitrate();
	}
}

export type DecidedAction =
	| { type: "attack"; targetEntityId: number; damage: number }
	| { type: "move"; toX: number; toZ: number }
	| {
			type: "harvest";
			depositEntityId: number;
			targetX: number;
			targetZ: number;
	  }
	| { type: "build"; buildingType: string; tileX: number; tileZ: number }
	| { type: "mine"; targetX: number; targetZ: number }
	| { type: "idle" };
