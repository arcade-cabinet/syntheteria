/**
 * Faction FSM tests — verifies state transitions and bias overrides.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	FactionFSM,
	type FactionStateContext,
	type FactionStateId,
	getFactionFSM,
	resetFactionFSMs,
} from "../fsm/FactionFSM";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<FactionStateContext> = {}): FactionStateContext {
	return {
		currentTurn: 1,
		unitCount: 6,
		popCap: 12,
		nearbyThreats: 0,
		enemyFactionContacted: false,
		territoryPct: 0,
		buildingCount: 3,
		motorPoolCount: 1,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FactionFSM", () => {
	let fsm: FactionFSM;

	beforeEach(() => {
		fsm = new FactionFSM();
	});

	it("starts in EXPLORE state", () => {
		expect(fsm.currentStateId).toBe("EXPLORE");
	});

	it("EXPLORE → EXPAND at turn 10", () => {
		fsm.update(makeCtx({ currentTurn: 9 }));
		expect(fsm.currentStateId).toBe("EXPLORE");

		fsm.update(makeCtx({ currentTurn: 10 }));
		expect(fsm.currentStateId).toBe("EXPAND");
	});

	it("EXPLORE → RETREAT when units < 3", () => {
		fsm.update(makeCtx({ unitCount: 2 }));
		expect(fsm.currentStateId).toBe("RETREAT");
	});

	it("EXPLORE → FORTIFY when nearbyThreats >= 3", () => {
		fsm.update(makeCtx({ nearbyThreats: 3 }));
		expect(fsm.currentStateId).toBe("FORTIFY");
	});

	it("EXPAND → ATTACK when conditions met", () => {
		// First get to EXPAND
		fsm.update(makeCtx({ currentTurn: 15 }));
		expect(fsm.currentStateId).toBe("EXPAND");

		// Not enough conditions yet
		fsm.update(makeCtx({ currentTurn: 39, unitCount: 10, enemyFactionContacted: true }));
		expect(fsm.currentStateId).toBe("EXPAND");

		// All conditions met: turn 40+, enemy contacted, units > 8
		fsm.update(makeCtx({ currentTurn: 40, unitCount: 10, enemyFactionContacted: true }));
		expect(fsm.currentStateId).toBe("ATTACK");
	});

	it("EXPAND → FORTIFY when threats appear", () => {
		fsm.update(makeCtx({ currentTurn: 15 }));
		expect(fsm.currentStateId).toBe("EXPAND");

		fsm.update(makeCtx({ currentTurn: 20, nearbyThreats: 4 }));
		expect(fsm.currentStateId).toBe("FORTIFY");
	});

	it("FORTIFY → EXPAND when threats gone and enough units", () => {
		// Get to FORTIFY
		fsm.update(makeCtx({ nearbyThreats: 3 }));
		expect(fsm.currentStateId).toBe("FORTIFY");

		// Threats cleared, units rebuilt
		fsm.update(makeCtx({ nearbyThreats: 0, unitCount: 6 }));
		expect(fsm.currentStateId).toBe("EXPAND");
	});

	it("FORTIFY → ATTACK when threats gone and attack conditions met", () => {
		// Get to FORTIFY
		fsm.update(makeCtx({ nearbyThreats: 3, currentTurn: 50 }));
		expect(fsm.currentStateId).toBe("FORTIFY");

		// Threats gone, can attack
		fsm.update(makeCtx({
			nearbyThreats: 0,
			unitCount: 8,
			currentTurn: 50,
			enemyFactionContacted: true,
		}));
		expect(fsm.currentStateId).toBe("ATTACK");
	});

	it("ATTACK → RETREAT when units < 3", () => {
		// Get to ATTACK
		fsm.update(makeCtx({ currentTurn: 15 })); // → EXPAND
		fsm.update(makeCtx({ currentTurn: 45, unitCount: 10, enemyFactionContacted: true })); // → ATTACK
		expect(fsm.currentStateId).toBe("ATTACK");

		fsm.update(makeCtx({ currentTurn: 50, unitCount: 2 }));
		expect(fsm.currentStateId).toBe("RETREAT");
	});

	it("ATTACK → EXPAND when units drop to 5", () => {
		fsm.update(makeCtx({ currentTurn: 15 }));
		fsm.update(makeCtx({ currentTurn: 45, unitCount: 10, enemyFactionContacted: true }));
		expect(fsm.currentStateId).toBe("ATTACK");

		fsm.update(makeCtx({ currentTurn: 50, unitCount: 5 }));
		expect(fsm.currentStateId).toBe("EXPAND");
	});

	it("RETREAT → EXPAND when units rebuilt to 5+", () => {
		fsm.update(makeCtx({ unitCount: 2 }));
		expect(fsm.currentStateId).toBe("RETREAT");

		fsm.update(makeCtx({ unitCount: 5, currentTurn: 20 }));
		expect(fsm.currentStateId).toBe("EXPAND");
	});

	it("RETREAT → EXPLORE when early game and units rebuilt", () => {
		fsm.update(makeCtx({ unitCount: 2, currentTurn: 5 }));
		expect(fsm.currentStateId).toBe("RETREAT");

		fsm.update(makeCtx({ unitCount: 5, currentTurn: 8 }));
		expect(fsm.currentStateId).toBe("EXPLORE");
	});

	it("RETREAT → FORTIFY when rebuilt but threats persist", () => {
		fsm.update(makeCtx({ unitCount: 2 }));
		expect(fsm.currentStateId).toBe("RETREAT");

		fsm.update(makeCtx({ unitCount: 6, nearbyThreats: 4 }));
		expect(fsm.currentStateId).toBe("FORTIFY");
	});

	it("tracks previousStateId", () => {
		expect(fsm.previousStateId).toBe(null);

		fsm.update(makeCtx({ currentTurn: 15 }));
		expect(fsm.previousStateId).toBe("EXPLORE");
		expect(fsm.currentStateId).toBe("EXPAND");
	});

	it("stays in same state when no transition fires", () => {
		fsm.update(makeCtx({ currentTurn: 5 }));
		expect(fsm.currentStateId).toBe("EXPLORE");
		expect(fsm.previousStateId).toBe(null);
	});
});

describe("FactionFSM bias overrides", () => {
	it("EXPLORE state boosts scout and expand", () => {
		const fsm = new FactionFSM("EXPLORE");
		const bias = fsm.getBias();
		expect(bias.scout).toBeGreaterThan(1);
		expect(bias.expand).toBeGreaterThan(1);
		expect(bias.attack).toBeLessThan(1);
	});

	it("ATTACK state boosts attack and chase", () => {
		const fsm = new FactionFSM("ATTACK");
		const bias = fsm.getBias();
		expect(bias.attack).toBeGreaterThan(1);
		expect(bias.chase).toBeGreaterThan(1);
		expect(bias.idle).toBeLessThan(1);
	});

	it("FORTIFY state boosts evade and build", () => {
		const fsm = new FactionFSM("FORTIFY");
		const bias = fsm.getBias();
		expect(bias.build).toBeGreaterThan(1);
		expect(bias.evade).toBeGreaterThan(1);
		expect(bias.scout).toBeLessThan(1);
	});

	it("RETREAT state boosts evade strongly", () => {
		const fsm = new FactionFSM("RETREAT");
		const bias = fsm.getBias();
		expect(bias.evade).toBeGreaterThanOrEqual(2);
		expect(bias.attack).toBeLessThan(0.5);
	});

	it("EXPAND state boosts build and expand", () => {
		const fsm = new FactionFSM("EXPAND");
		const bias = fsm.getBias();
		expect(bias.build).toBeGreaterThan(1);
		expect(bias.expand).toBeGreaterThan(1);
	});
});

describe("FSM registry", () => {
	beforeEach(() => {
		resetFactionFSMs();
	});

	it("returns same FSM instance for same faction", () => {
		const fsm1 = getFactionFSM("reclaimers");
		const fsm2 = getFactionFSM("reclaimers");
		expect(fsm1).toBe(fsm2);
	});

	it("returns different FSM instances for different factions", () => {
		const fsm1 = getFactionFSM("reclaimers");
		const fsm2 = getFactionFSM("volt_collective");
		expect(fsm1).not.toBe(fsm2);
	});

	it("resetFactionFSMs clears all instances", () => {
		const fsm1 = getFactionFSM("reclaimers");
		fsm1.update(makeCtx({ currentTurn: 15 }));
		expect(fsm1.currentStateId).toBe("EXPAND");

		resetFactionFSMs();

		const fsm2 = getFactionFSM("reclaimers");
		expect(fsm2.currentStateId).toBe("EXPLORE");
		expect(fsm2).not.toBe(fsm1);
	});

	it("each faction FSM transitions independently", () => {
		const recl = getFactionFSM("reclaimers");
		const volt = getFactionFSM("volt_collective");

		recl.update(makeCtx({ currentTurn: 15 }));
		volt.update(makeCtx({ currentTurn: 5 }));

		expect(recl.currentStateId).toBe("EXPAND");
		expect(volt.currentStateId).toBe("EXPLORE");
	});
});
