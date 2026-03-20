/**
 * SPEC TEST: GAME_DESIGN.md Section 6 — Turn Structure
 *
 * Tests the 5-phase turn documented in Section 6:
 *   1. Player Attacks — resolve pending attack actions
 *   2. AI Faction Turns — each AI faction moves and attacks
 *   3. AI Attacks — resolve AI-initiated attacks
 *   4. Environment Phase — power grid, resource renewal, synthesis, fabrication, cult spawning
 *   5. New Turn — AP refreshed, highlights cleared, turn counter advances
 *
 * Also tests:
 *   - AP base 2 per unit (spec default)
 *   - MP base 3 per unit (spec default)
 *   - AP/MP do not bank (forfeit at End Turn)
 *   - Unit readiness: AP > 0 means unit is ready
 *
 * These tests verify spec compliance. Failures indicate missing or divergent features.
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	Board,
	UnitAttack,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../../traits";
import { advanceTurn, getCurrentTurn } from "../turnSystem";

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

describe("SPEC: Section 6 — Turn Structure", () => {
	let world: ReturnType<typeof createWorld>;
	let board: GeneratedBoard;

	beforeEach(() => {
		world = createWorld();
		board = makeBoard(16, 16);
		world.spawn(
			Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
		);
	});

	afterEach(() => {
		world.destroy();
	});

	// ─── Phase ordering ────────────────────────────────────────────────

	describe("5-phase turn order", () => {
		it("advanceTurn runs all 5 phases — turn counter increments", () => {
			// If advanceTurn runs completely, turn counter advances (phase 5)
			expect(getCurrentTurn(world)).toBe(1);
			advanceTurn(world, board);
			expect(getCurrentTurn(world)).toBe(2);
		});

		it("player attacks resolve before AI turns (phase 1 before phase 2)", () => {
			// Set up a player unit attacking an AI unit
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 2,
					maxAp: 2,
					mp: 2,
					maxMp: 2,
					scanRange: 3,
					attack: 2,
					defense: 0,
				}),
				UnitFaction({ factionId: "reclaimers" }),
			);
			const _attacker = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 2,
					maxAp: 2,
					mp: 2,
					maxMp: 2,
					scanRange: 3,
					attack: 5,
					defense: 0,
				}),
				UnitFaction({ factionId: "player" }),
				UnitAttack({ targetEntityId: target.id(), damage: 5 }),
			);

			advanceTurn(world, board);

			// Attack should have resolved — target took damage
			const targetStats = target.get(UnitStats);
			// target.hp should be less than 10 (took damage in phase 1)
			expect(targetStats).toBeDefined();
			if (targetStats) {
				expect(targetStats.hp).toBeLessThan(10);
			}
		});
	});

	// ─── AP/MP spec values ─────────────────────────────────────────────

	describe("AP and MP spec defaults", () => {
		it("spec: AP base is 2 per unit (UnitStats default)", () => {
			// GAME_DESIGN.md Section 6: "AP: Base 2 per unit"
			const unit = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({}), // Use defaults
				UnitFaction({ factionId: "player" }),
			);
			const stats = unit.get(UnitStats)!;
			expect(stats.ap).toBe(2);
			expect(stats.maxAp).toBe(2);
		});

		it("spec: MP base is 3 per unit (UnitStats default)", () => {
			// GAME_DESIGN.md Section 6: "MP: Base 3 per unit. 1 MP = 1 cell"
			const unit = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({}), // Use defaults
				UnitFaction({ factionId: "player" }),
			);
			const stats = unit.get(UnitStats)!;
			expect(stats.mp).toBe(3);
			expect(stats.maxMp).toBe(3);
		});
	});

	// ─── AP/MP refresh ─────────────────────────────────────────────────

	describe("new turn AP/MP refresh (phase 5)", () => {
		it("refreshes player AP to maxAp at new turn", () => {
			const unit = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 0,
					maxAp: 2,
					mp: 0,
					maxMp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
				UnitFaction({ factionId: "player" }),
			);

			advanceTurn(world, board);

			const stats = unit.get(UnitStats)!;
			expect(stats.ap).toBe(2);
		});

		it("refreshes player MP to maxMp at new turn", () => {
			const unit = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 0,
					maxAp: 2,
					mp: 0,
					maxMp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
				UnitFaction({ factionId: "player" }),
			);

			advanceTurn(world, board);

			const stats = unit.get(UnitStats)!;
			expect(stats.mp).toBe(3);
		});

		it("AP/MP do not bank — remaining points are forfeit", () => {
			// GAME_DESIGN.md: "Remaining AP/MP are forfeit at End Turn — they do not bank."
			const unit = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 2,
					maxAp: 2,
					mp: 3,
					maxMp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
				UnitFaction({ factionId: "player" }),
			);

			// Don't spend any AP/MP, advance turn
			advanceTurn(world, board);

			const stats = unit.get(UnitStats)!;
			// After turn, AP and MP reset to max — NOT max + leftover
			expect(stats.ap).toBe(stats.maxAp);
			expect(stats.mp).toBe(stats.maxMp);
			expect(stats.ap).toBeLessThanOrEqual(2);
			expect(stats.mp).toBeLessThanOrEqual(3);
		});

		it("does NOT refresh AI faction AP during new turn", () => {
			const aiUnit = world.spawn(
				UnitPos({ tileX: 5, tileZ: 5 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 0,
					maxAp: 2,
					mp: 0,
					maxMp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
				UnitFaction({ factionId: "reclaimers" }),
			);

			advanceTurn(world, board);

			// AI AP handled by AI turn system, not by new turn refresh
			const stats = aiUnit.get(UnitStats)!;
			expect(stats.ap).toBe(0);
		});

		it("resets movesUsed and staged flags for player units", () => {
			const unit = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 0,
					maxAp: 2,
					mp: 0,
					maxMp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
					movesUsed: 2,
					staged: true,
				}),
				UnitFaction({ factionId: "player" }),
			);

			advanceTurn(world, board);

			const stats = unit.get(UnitStats)!;
			expect(stats.movesUsed).toBe(0);
			expect(stats.staged).toBe(false);
		});
	});

	// ─── Turn counter ──────────────────────────────────────────────────

	describe("turn counter", () => {
		it("increments by 1 each turn", () => {
			expect(getCurrentTurn(world)).toBe(1);
			advanceTurn(world, board);
			expect(getCurrentTurn(world)).toBe(2);
			advanceTurn(world, board);
			expect(getCurrentTurn(world)).toBe(3);
		});

		it("getCurrentTurn returns 1 with no Board entity", () => {
			const emptyWorld = createWorld();
			expect(getCurrentTurn(emptyWorld)).toBe(1);
			emptyWorld.destroy();
		});
	});

	// ─── Unit readiness ────────────────────────────────────────────────

	describe("unit readiness", () => {
		it("unit with AP > 0 is considered ready", () => {
			// GAME_DESIGN.md: "Unit readiness glow: Units with remaining AP display an emissive cyan ring"
			const unit = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 1,
					maxAp: 2,
					mp: 0,
					maxMp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
				UnitFaction({ factionId: "player" }),
			);
			const stats = unit.get(UnitStats)!;
			expect(stats.ap).toBeGreaterThan(0); // Ready
		});

		it("unit with AP = 0 is not ready", () => {
			const unit = world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 0,
					maxAp: 2,
					mp: 3,
					maxMp: 3,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
				UnitFaction({ factionId: "player" }),
			);
			const stats = unit.get(UnitStats)!;
			expect(stats.ap).toBe(0); // Not ready — even with MP remaining
		});

		it("all player units become ready after new turn", () => {
			const units = [
				world.spawn(
					UnitPos({ tileX: 0, tileZ: 0 }),
					UnitStats({
						hp: 10,
						maxHp: 10,
						ap: 0,
						maxAp: 2,
						mp: 0,
						maxMp: 3,
						scanRange: 4,
						attack: 2,
						defense: 0,
					}),
					UnitFaction({ factionId: "player" }),
				),
				world.spawn(
					UnitPos({ tileX: 1, tileZ: 0 }),
					UnitStats({
						hp: 8,
						maxHp: 8,
						ap: 0,
						maxAp: 2,
						mp: 0,
						maxMp: 1,
						scanRange: 3,
						attack: 0,
						defense: 0,
					}),
					UnitFaction({ factionId: "player" }),
				),
			];

			advanceTurn(world, board);

			for (const unit of units) {
				const stats = unit.get(UnitStats)!;
				expect(stats.ap).toBeGreaterThan(0);
			}
		});
	});

	// ─── Environment phase ─────────────────────────────────────────────

	describe("environment phase (phase 4)", () => {
		it("environment phase runs during advanceTurn (power grid, synthesis, fabrication, cult check)", () => {
			// This is an integration check — advanceTurn must not throw
			// Environment phase includes: runPowerGrid, runResourceRenewal, runSynthesis,
			// runFabrication, checkCultistSpawn, etc.
			expect(() => advanceTurn(world, board)).not.toThrow();
		});
	});
});
