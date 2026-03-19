import { beforeEach, describe, expect, it } from "vitest";
import { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import {
	AttackEvaluator,
	BuildEvaluator,
	ChaseEnemyEvaluator,
	ExpandEvaluator,
	HarvestEvaluator,
	IdleEvaluator,
	ScoutEvaluator,
	setTurnContext,
	type TurnContext,
} from "../goals/evaluators";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAgent(
	overrides: Partial<{
		entityId: number;
		factionId: string;
		tileX: number;
		tileZ: number;
		hp: number;
		ap: number;
		scanRange: number;
		attackRange: number;
		attack: number;
	}> = {},
): SyntheteriaAgent {
	const agent = new SyntheteriaAgent(
		overrides.entityId ?? 1,
		overrides.factionId ?? "reclaimers",
	);
	agent.syncFromSnapshot({
		entityId: overrides.entityId ?? 1,
		factionId: overrides.factionId ?? "reclaimers",
		tileX: overrides.tileX ?? 0,
		tileZ: overrides.tileZ ?? 0,
		hp: overrides.hp ?? 10,
		ap: overrides.ap ?? 2,
		maxAp: 2,
		mp: 3,
		maxMp: 3,
		scanRange: overrides.scanRange ?? 4,
		attackRange: overrides.attackRange ?? 1,
		attack: overrides.attack ?? 2,
		defense: 0,
	});
	return agent;
}

function setCtx(overrides: Partial<TurnContext> = {}): void {
	setTurnContext({
		enemies: [],
		deposits: [],
		boardCenter: { x: 8, z: 8 },
		boardSize: { width: 16, height: 16 },
		aggressionMult: 1,
		buildOptions: [],
		factionBuildingCount: 0,
		hasMotorPool: false,
		totalDeposits: 0,
		currentTurn: 1,
		rememberedEnemies: [],
		factionCenter: { x: 8, z: 8 },
		mineableTiles: [],
		...overrides,
	});
}

// ---------------------------------------------------------------------------
// AttackEvaluator
// ---------------------------------------------------------------------------

describe("AttackEvaluator", () => {
	const evaluator = new AttackEvaluator(1.0);

	it("returns 0 when no enemies in range", () => {
		const agent = makeAgent({ attackRange: 1 });
		setCtx({ enemies: [{ entityId: 99, x: 5, z: 5, factionId: "player" }] });
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("returns high score when enemy is adjacent", () => {
		const agent = makeAgent({ attackRange: 1 });
		setCtx({ enemies: [{ entityId: 99, x: 1, z: 0, factionId: "player" }] });
		const score = evaluator.calculateDesirability(agent);
		expect(score).toBeGreaterThan(0.8);
	});

	it("returns 0 when attackRange is 0", () => {
		const agent = makeAgent({ attackRange: 0, attack: 0 });
		setCtx({ enemies: [{ entityId: 99, x: 1, z: 0, factionId: "player" }] });
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("setGoal picks closest enemy", () => {
		const agent = makeAgent({ attackRange: 2 });
		setCtx({
			enemies: [
				{ entityId: 10, x: 2, z: 0, factionId: "player" },
				{ entityId: 20, x: 1, z: 0, factionId: "player" },
			],
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction).not.toBeNull();
		expect(agent.decidedAction!.type).toBe("attack");
		if (agent.decidedAction!.type === "attack") {
			expect(agent.decidedAction!.targetEntityId).toBe(20); // closer
		}
	});

	it("aggressionMult scales desirability", () => {
		const agent = makeAgent({ attackRange: 1 });
		setCtx({
			enemies: [{ entityId: 99, x: 1, z: 0, factionId: "player" }],
			aggressionMult: 0.5,
		});
		const lowAggression = evaluator.calculateDesirability(agent);

		setCtx({
			enemies: [{ entityId: 99, x: 1, z: 0, factionId: "player" }],
			aggressionMult: 2,
		});
		const highAggression = evaluator.calculateDesirability(agent);

		expect(highAggression).toBeGreaterThan(lowAggression);
	});
});

// ---------------------------------------------------------------------------
// ChaseEnemyEvaluator
// ---------------------------------------------------------------------------

describe("ChaseEnemyEvaluator", () => {
	it("returns 0 when no enemies exist", () => {
		const evaluator = new ChaseEnemyEvaluator(1.0);
		const agent = makeAgent();
		setCtx({ enemies: [] });
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("does not score enemies already in attack range", () => {
		const evaluator = new ChaseEnemyEvaluator(1.0);
		const agent = makeAgent({ attackRange: 1 });
		setCtx({ enemies: [{ entityId: 99, x: 1, z: 0, factionId: "player" }] });
		// Enemy at dist=1 is within attackRange=1, so ChaseEvaluator skips it
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("scores enemies beyond attack range but within pursuit distance", () => {
		const evaluator = new ChaseEnemyEvaluator(1.0);
		const agent = makeAgent({ attackRange: 1 });
		setCtx({ enemies: [{ entityId: 99, x: 3, z: 0, factionId: "player" }] });
		expect(evaluator.calculateDesirability(agent)).toBeGreaterThan(0);
	});

	it("reactiveOnly skips enemies beyond scanRange", () => {
		const evaluator = new ChaseEnemyEvaluator(1.0);
		evaluator.reactiveOnly = true;
		const agent = makeAgent({ scanRange: 4, attackRange: 1 });
		setCtx({ enemies: [{ entityId: 99, x: 10, z: 10, factionId: "player" }] });
		// Distance = 20, scanRange = 4 → skip
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("reactiveOnly allows enemies within scanRange", () => {
		const evaluator = new ChaseEnemyEvaluator(1.0);
		evaluator.reactiveOnly = true;
		const agent = makeAgent({ scanRange: 4, attackRange: 1 });
		setCtx({ enemies: [{ entityId: 99, x: 3, z: 0, factionId: "player" }] });
		// Distance = 3, scanRange = 4 → allow
		expect(evaluator.calculateDesirability(agent)).toBeGreaterThan(0);
	});

	it("returns 0 for attackRange=0 units", () => {
		const evaluator = new ChaseEnemyEvaluator(1.0);
		const agent = makeAgent({ attackRange: 0 });
		setCtx({ enemies: [{ entityId: 99, x: 3, z: 0, factionId: "player" }] });
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("setGoal picks the closest enemy to chase", () => {
		const evaluator = new ChaseEnemyEvaluator(1.0);
		const agent = makeAgent({ attackRange: 1 });
		setCtx({
			enemies: [
				{ entityId: 10, x: 5, z: 5, factionId: "player" },
				{ entityId: 20, x: 3, z: 0, factionId: "player" },
			],
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("move");
		if (agent.decidedAction!.type === "move") {
			expect(agent.decidedAction!.toX).toBe(3);
			expect(agent.decidedAction!.toZ).toBe(0);
		}
	});
});

// ---------------------------------------------------------------------------
// HarvestEvaluator
// ---------------------------------------------------------------------------

describe("HarvestEvaluator", () => {
	const evaluator = new HarvestEvaluator(1.0);

	it("returns 0 when no deposits exist", () => {
		const agent = makeAgent();
		setCtx({ deposits: [] });
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("scores nearby deposits", () => {
		const agent = makeAgent({ scanRange: 4 });
		setCtx({ deposits: [{ entityId: 50, x: 2, z: 0 }] });
		expect(evaluator.calculateDesirability(agent)).toBeGreaterThan(0);
	});

	it("ignores deposits beyond 2x scanRange", () => {
		const agent = makeAgent({ scanRange: 4 });
		setCtx({ deposits: [{ entityId: 50, x: 15, z: 15 }] });
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("setGoal harvests adjacent deposit", () => {
		const agent = makeAgent();
		setCtx({ deposits: [{ entityId: 50, x: 1, z: 0 }] });
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("harvest");
	});

	it("setGoal moves toward distant deposit", () => {
		const agent = makeAgent({ scanRange: 4 });
		setCtx({ deposits: [{ entityId: 50, x: 3, z: 0 }] });
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("move");
		if (agent.decidedAction!.type === "move") {
			expect(agent.decidedAction!.toX).toBe(3);
		}
	});
});

// ---------------------------------------------------------------------------
// ExpandEvaluator
// ---------------------------------------------------------------------------

describe("ExpandEvaluator", () => {
	const evaluator = new ExpandEvaluator(1.0);

	it("returns moderate score on turn 1", () => {
		const agent = makeAgent({ tileX: 0, tileZ: 0 });
		setCtx({ currentTurn: 1 });
		const score = evaluator.calculateDesirability(agent);
		// 0.5 + 0.4 * min(1, 1/20) = 0.5 + 0.4 * 0.05 = 0.52
		expect(score).toBeCloseTo(0.52, 2);
	});

	it("returns higher score as turns progress", () => {
		const agent = makeAgent({ tileX: 0, tileZ: 0 });
		setCtx({ currentTurn: 5 });
		const earlyScore = evaluator.calculateDesirability(agent);

		setCtx({ currentTurn: 30 });
		const lateScore = evaluator.calculateDesirability(agent);

		expect(lateScore).toBeGreaterThan(earlyScore);
	});

	it("caps at 0.9 by turn 20", () => {
		const agent = makeAgent({ tileX: 0, tileZ: 0 });
		setCtx({ currentTurn: 20 });
		const score = evaluator.calculateDesirability(agent);
		expect(score).toBe(0.9);
	});

	it("setGoal targets remembered enemies when available", () => {
		const agent = makeAgent({ tileX: 0, tileZ: 0 });
		setCtx({
			rememberedEnemies: [
				{ entityId: 99, x: 10, z: 10, factionId: "signal_choir" },
			],
			factionCenter: { x: 2, z: 2 },
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("move");
		if (agent.decidedAction!.type === "move") {
			expect(agent.decidedAction!.toX).toBe(10);
			expect(agent.decidedAction!.toZ).toBe(10);
		}
	});

	it("setGoal moves away from faction center toward frontier", () => {
		const agent = makeAgent({ tileX: 5, tileZ: 5 });
		setCtx({
			rememberedEnemies: [],
			factionCenter: { x: 3, z: 3 },
			boardSize: { width: 44, height: 44 },
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("move");
		if (agent.decidedAction!.type === "move") {
			// Agent is at (5,5), faction center is (3,3) → move toward (10,10)
			expect(agent.decidedAction!.toX).toBe(10);
			expect(agent.decidedAction!.toZ).toBe(10);
		}
	});
});

// ---------------------------------------------------------------------------
// IdleEvaluator
// ---------------------------------------------------------------------------

describe("IdleEvaluator", () => {
	const evaluator = new IdleEvaluator(1.0);

	it("returns a low constant desirability", () => {
		const agent = makeAgent();
		setCtx();
		expect(evaluator.calculateDesirability(agent)).toBe(0.3);
	});

	it("setGoal sets idle action", () => {
		const agent = makeAgent();
		evaluator.setGoal(agent);
		expect(agent.decidedAction).toEqual({ type: "idle" });
	});
});

// ---------------------------------------------------------------------------
// BuildEvaluator
// ---------------------------------------------------------------------------

describe("BuildEvaluator", () => {
	const evaluator = new BuildEvaluator(1.0);

	it("returns 0 when no build options available", () => {
		const agent = makeAgent();
		setCtx({ buildOptions: [] });
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("returns positive score when build options exist", () => {
		const agent = makeAgent();
		setCtx({
			buildOptions: [{ buildingType: "storage_hub", tileX: 2, tileZ: 2 }],
			factionBuildingCount: 2,
		});
		expect(evaluator.calculateDesirability(agent)).toBeGreaterThan(0);
	});

	it("returns higher score when no motor pool exists", () => {
		const agent = makeAgent();
		setCtx({
			buildOptions: [{ buildingType: "motor_pool", tileX: 2, tileZ: 2 }],
			hasMotorPool: false,
			factionBuildingCount: 2,
		});
		const noMotorPool = evaluator.calculateDesirability(agent);

		setCtx({
			buildOptions: [{ buildingType: "storage_hub", tileX: 2, tileZ: 2 }],
			hasMotorPool: true,
			factionBuildingCount: 2,
		});
		const withMotorPool = evaluator.calculateDesirability(agent);

		expect(noMotorPool).toBeGreaterThan(withMotorPool);
	});

	it("setGoal picks storm_transmitter over storage_hub by priority", () => {
		const agent = makeAgent({ tileX: 2, tileZ: 2 });
		setCtx({
			buildOptions: [
				{ buildingType: "storage_hub", tileX: 3, tileZ: 2 },
				{ buildingType: "storm_transmitter", tileX: 4, tileZ: 2 },
			],
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction).not.toBeNull();
		expect(agent.decidedAction!.type).toBe("build");
		if (agent.decidedAction!.type === "build") {
			expect(agent.decidedAction!.buildingType).toBe("storm_transmitter");
		}
	});

	it("setGoal moves toward build site when far away", () => {
		const agent = makeAgent({ tileX: 0, tileZ: 0 });
		setCtx({
			buildOptions: [{ buildingType: "storage_hub", tileX: 10, tileZ: 10 }],
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("move");
	});
});

// ---------------------------------------------------------------------------
// ScoutEvaluator
// ---------------------------------------------------------------------------

describe("ScoutEvaluator", () => {
	const evaluator = new ScoutEvaluator(1.0);

	it("returns 0 when deposits exist nearby and enemies are known", () => {
		const agent = makeAgent({ scanRange: 4 });
		setCtx({
			deposits: [{ entityId: 50, x: 2, z: 0 }],
			totalDeposits: 5,
			currentTurn: 1,
			enemies: [{ entityId: 99, x: 20, z: 20, factionId: "player" }],
		});
		expect(evaluator.calculateDesirability(agent)).toBe(0);
	});

	it("returns nonzero when deposits nearby but turn > 10 and no enemies found", () => {
		const agent = makeAgent({ scanRange: 4 });
		setCtx({
			deposits: [{ entityId: 50, x: 2, z: 0 }],
			totalDeposits: 5,
			currentTurn: 20,
			enemies: [],
			rememberedEnemies: [],
		});
		// timeBoost + noEnemiesBoost
		expect(evaluator.calculateDesirability(agent)).toBeGreaterThan(0);
	});

	it("returns 0.6+ when no nearby deposits but some exist globally", () => {
		const agent = makeAgent({ scanRange: 4 });
		setCtx({
			deposits: [{ entityId: 50, x: 20, z: 20 }],
			totalDeposits: 5,
			currentTurn: 1,
		});
		expect(evaluator.calculateDesirability(agent)).toBeGreaterThanOrEqual(0.6);
	});

	it("returns 0.1+ when no deposits exist anywhere", () => {
		const agent = makeAgent({ scanRange: 4 });
		setCtx({ deposits: [], totalDeposits: 0, currentTurn: 1 });
		expect(evaluator.calculateDesirability(agent)).toBeGreaterThanOrEqual(0.1);
	});

	it("setGoal explores quadrant when no enemies encountered", () => {
		const agent = makeAgent({ tileX: 0, tileZ: 0, scanRange: 2 });
		setCtx({
			deposits: [{ entityId: 50, x: 5, z: 5 }],
			totalDeposits: 2,
			enemies: [],
			rememberedEnemies: [],
			boardSize: { width: 20, height: 20 },
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("move");
		// With no enemies, scouts explore toward furthest quadrant
		if (agent.decidedAction!.type === "move") {
			expect(agent.decidedAction!.toX).toBe(15); // 75% of 20
			expect(agent.decidedAction!.toZ).toBe(15);
		}
	});

	it("setGoal moves toward closest deposit when enemies are known", () => {
		const agent = makeAgent({ tileX: 0, tileZ: 0, scanRange: 2 });
		setCtx({
			deposits: [
				{ entityId: 50, x: 20, z: 20 },
				{ entityId: 51, x: 10, z: 5 },
			],
			totalDeposits: 2,
			enemies: [{ entityId: 99, x: 30, z: 30, factionId: "player" }],
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("move");
		if (agent.decidedAction!.type === "move") {
			expect(agent.decidedAction!.toX).toBe(10);
			expect(agent.decidedAction!.toZ).toBe(5);
		}
	});

	it("setGoal explores quadrant when no deposits exist", () => {
		const agent = makeAgent({ tileX: 0, tileZ: 0 });
		setCtx({
			deposits: [],
			totalDeposits: 0,
			boardSize: { width: 20, height: 20 },
			enemies: [{ entityId: 99, x: 30, z: 30, factionId: "player" }],
		});
		evaluator.setGoal(agent);
		expect(agent.decidedAction!.type).toBe("move");
	});
});

// ---------------------------------------------------------------------------
// Full brain arbitration
// ---------------------------------------------------------------------------

describe("Think brain arbitration", () => {
	it("attack wins when enemy is adjacent and faction is aggressive", () => {
		const agent = makeAgent({ attackRange: 1, attack: 3 });
		// Add evaluators with aggressive bias
		agent.addEvaluator(new AttackEvaluator(1.0));
		agent.addEvaluator(new ChaseEnemyEvaluator(0.8));
		agent.addEvaluator(new HarvestEvaluator(0.3));
		agent.addEvaluator(new ExpandEvaluator(0.3));
		agent.addEvaluator(new IdleEvaluator(0.1));

		setCtx({
			enemies: [{ entityId: 99, x: 1, z: 0, factionId: "player" }],
			deposits: [{ entityId: 50, x: 2, z: 2 }],
		});

		agent.arbitrate();
		expect(agent.decidedAction).not.toBeNull();
		expect(agent.decidedAction!.type).toBe("attack");
	});

	it("harvest wins when deposits nearby and no enemies in range", () => {
		const agent = makeAgent({ attackRange: 1, scanRange: 4 });
		// Harvest-focused bias (like reclaimers)
		agent.addEvaluator(new AttackEvaluator(0.6));
		agent.addEvaluator(new ChaseEnemyEvaluator(0.5));
		agent.addEvaluator(new HarvestEvaluator(1.0));
		agent.addEvaluator(new ExpandEvaluator(0.3));
		agent.addEvaluator(new IdleEvaluator(0.1));

		setCtx({
			enemies: [{ entityId: 99, x: 15, z: 15, factionId: "player" }],
			deposits: [{ entityId: 50, x: 1, z: 0 }],
		});

		agent.arbitrate();
		expect(agent.decidedAction).not.toBeNull();
		expect(agent.decidedAction!.type).toBe("harvest");
	});

	it("idle wins when nothing interesting is nearby on turn 1", () => {
		const agent = makeAgent({
			attackRange: 1,
			scanRange: 2,
			tileX: 8,
			tileZ: 8,
		});
		agent.addEvaluator(new AttackEvaluator(0.5));
		agent.addEvaluator(new ChaseEnemyEvaluator(0.5));
		agent.addEvaluator(new HarvestEvaluator(0.5));
		agent.addEvaluator(new ExpandEvaluator(0.1)); // Low expand bias
		agent.addEvaluator(new IdleEvaluator(0.5));

		setCtx({
			enemies: [], // No enemies
			deposits: [], // No deposits
			boardCenter: { x: 8, z: 8 }, // Already at center
			currentTurn: 1, // Early game — expand desire is low
		});

		agent.arbitrate();
		expect(agent.decidedAction).not.toBeNull();
		// On turn 1 with low expand bias and nothing around → idle or move
		expect(["idle", "move"]).toContain(agent.decidedAction!.type);
	});
});
