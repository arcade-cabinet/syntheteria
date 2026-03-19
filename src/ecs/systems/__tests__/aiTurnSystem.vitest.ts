import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../../board/types";
import { ResourceDeposit } from "../../traits/resource";
import { UnitAttack, UnitFaction, UnitMove, UnitPos, UnitStats } from "../../traits/unit";
import {
	type AiUnit,
	FACTION_PERSONALITY,
	type FactionSituation,
	resolveAllMoves,
	runAiTurns,
	scoreActions,
} from "../aiTurnSystem";

/** Build a W×H board where every tile is passable and flat. */
function makeBoard(width: number, height: number): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push({
				x,
				z,
				elevation: 0,
				passable: true,
				floorType: "durasteel_span",
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}
	return {
		config: { width, height, seed: "test", difficulty: "normal" },
		tiles,
	};
}

function makeAiUnit(overrides: Partial<AiUnit> = {}): AiUnit {
	return {
		entityId: 1,
		x: 0,
		z: 0,
		factionId: "reclaimers",
		ap: 2,
		maxAp: 2,
		mp: 3,
		maxMp: 3,
		hp: 10,
		scanRange: 4,
		attackRange: 1,
		attack: 3,
		...overrides,
	};
}

function makeSituation(overrides: Partial<FactionSituation> = {}): FactionSituation {
	return {
		unitCount: 1,
		totalHp: 10,
		enemyThreats: [],
		nearbyDeposits: [],
		boardCenter: { x: 8, z: 8 },
		...overrides,
	};
}

describe("aiTurnSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("ai unit moves one step toward player", () => {
		// AI at (0,0), player at (2,0) — AI should step to (1,0)
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);
		world.spawn(
			UnitPos({ tileX: 2, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(6, 6);
		runAiTurns(world, board);

		// AI queues a UnitMove instead of teleporting
		expect(aiUnit.has(UnitMove)).toBe(true);
		const move = aiUnit.get(UnitMove)!;
		expect(move.toX).toBe(1);
		expect(move.toZ).toBe(0);

		// Resolve the move
		resolveAllMoves(world);
		const pos = aiUnit.get(UnitPos)!;
		expect(pos.tileX).toBe(1);
		expect(pos.tileZ).toBe(0);
	});

	it("volt_collective does not chase player out of scanRange", () => {
		// AI at (0,0), player at (10,10) — scanRange=4, dist=20 > 4
		const voltUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "volt_collective" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);
		world.spawn(
			UnitPos({ tileX: 10, tileZ: 10 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(16, 16);
		runAiTurns(world, board);
		resolveAllMoves(world);

		// Volt may expand toward center but not toward player
		const pos = voltUnit.get(UnitPos)!;
		expect(pos.tileX).toBeLessThanOrEqual(1);
		expect(pos.tileZ).toBeLessThanOrEqual(1);
	});

	it("ai unit within attackRange queues attack instead of moving", () => {
		// AI at (0,0), player at (1,0) — adjacent, should attack not move
		const aiEntity = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4, attackRange: 1 }),
		);
		world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(4, 4);
		runAiTurns(world, board);

		// Position must remain unchanged (attacked, didn't move)
		const pos = aiEntity.get(UnitPos);
		expect(pos?.tileX).toBe(0);
		expect(pos?.tileZ).toBe(0);
	});

	it("ranged AI attacks from distance", () => {
		const aiEntity = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "signal_choir" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 6, attackRange: 3, attack: 4 }),
		);
		const player = world.spawn(
			UnitPos({ tileX: 2, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(8, 8);
		runAiTurns(world, board);

		// Should have queued an attack (target at distance 2, attackRange 3)
		expect(aiEntity.has(UnitAttack)).toBe(true);
		const atk = aiEntity.get(UnitAttack);
		expect(atk?.targetEntityId).toBe(player.id());
	});

	it("AP is refreshed after AI turns", () => {
		const aiEntity = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 1, maxAp: 3, scanRange: 4 }),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(10, 10);
		runAiTurns(world, board);

		expect(aiEntity.get(UnitStats)!.ap).toBe(3);
	});
});

describe("GOAP scoring", () => {
	it("iron_creed prefers attack over everything", () => {
		const personality = FACTION_PERSONALITY.iron_creed;
		const unit = makeAiUnit({ factionId: "iron_creed", attackRange: 1 });
		const situation = makeSituation({
			enemyThreats: [{ x: 1, z: 0, entityId: 99, factionId: "player" }],
			nearbyDeposits: [{ x: 0, z: 1, entityId: 50 }],
		});

		const action = scoreActions(unit, personality, situation, 1);
		expect(action.type).toBe("attack");
	});

	it("reclaimers prefer deposits when no adjacent enemies", () => {
		const personality = FACTION_PERSONALITY.reclaimers;
		const unit = makeAiUnit({ factionId: "reclaimers", x: 5, z: 5, attackRange: 1 });
		const situation = makeSituation({
			enemyThreats: [{ x: 15, z: 15, entityId: 99, factionId: "player" }],
			nearbyDeposits: [{ x: 6, z: 5, entityId: 50 }],
		});

		const action = scoreActions(unit, personality, situation, 1);
		// Should prefer deposit (harvestPriority=3) over distant enemy
		expect(action.type).toBe("move_to_deposit");
	});

	it("volt_collective ignores distant enemies", () => {
		const personality = FACTION_PERSONALITY.volt_collective;
		const unit = makeAiUnit({ factionId: "volt_collective", scanRange: 4, attackRange: 1 });
		const situation = makeSituation({
			enemyThreats: [{ x: 10, z: 10, entityId: 99, factionId: "player" }],
		});

		const action = scoreActions(unit, personality, situation, 1);
		// Distance 20 > scanRange 4, reactiveOnly=true → should not chase
		expect(action.type).not.toBe("move_to_enemy");
		expect(action.type).not.toBe("attack");
	});

	it("signal_choir always chases enemies aggressively", () => {
		const personality = FACTION_PERSONALITY.signal_choir;
		const unit = makeAiUnit({ factionId: "signal_choir", scanRange: 4, attackRange: 1 });
		const situation = makeSituation({
			enemyThreats: [{ x: 8, z: 8, entityId: 99, factionId: "player" }],
		});

		const action = scoreActions(unit, personality, situation, 1);
		// Signal choir has aggression=3, reactiveOnly=false → should chase
		expect(action.type).toBe("move_to_enemy");
	});

	it("unit with attackRange=0 does not chase enemies", () => {
		const personality = FACTION_PERSONALITY.reclaimers;
		const unit = makeAiUnit({ attackRange: 0, attack: 0 });
		const situation = makeSituation({
			enemyThreats: [{ x: 1, z: 0, entityId: 99, factionId: "player" }],
		});

		const action = scoreActions(unit, personality, situation, 1);
		expect(action.type).not.toBe("attack");
		expect(action.type).not.toBe("move_to_enemy");
	});

	it("higher difficulty multiplier increases attack scores", () => {
		const personality = FACTION_PERSONALITY.iron_creed;
		const unit = makeAiUnit({ factionId: "iron_creed", attackRange: 1 });
		const situation = makeSituation({
			enemyThreats: [{ x: 1, z: 0, entityId: 99, factionId: "player" }],
		});

		const normalAction = scoreActions(unit, personality, situation, 1);
		const hardAction = scoreActions(unit, personality, situation, 2);

		// Hard mode should have higher attack score
		expect(hardAction.score).toBeGreaterThan(normalAction.score);
	});
});
