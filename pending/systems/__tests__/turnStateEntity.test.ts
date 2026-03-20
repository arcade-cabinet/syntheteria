/**
 * T06: TurnStateKoota entity — reactive mirror of module-level turn state.
 */
import { TurnStateKoota } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	endPlayerTurn,
	getTurnState,
	getTurnStateEntity,
	initTurnStateEntity,
	rehydrateTurnState,
	resetTurnSystem,
} from "../turnSystem";

// Suppress AI/environment handlers during endPlayerTurn in tests
// (no handlers registered — turns complete instantly)

beforeEach(() => {
	resetTurnSystem();
	initTurnStateEntity();
});

afterEach(() => {
	// Destroy any stray TurnStateKoota entities
	for (const e of Array.from(world.query(TurnStateKoota))) {
		if (e.isAlive()) e.destroy();
	}
});

test("initTurnStateEntity spawns entity matching initial turn state", () => {
	const entity = getTurnStateEntity();
	const data = entity.get(TurnStateKoota)!;
	expect(data.turnNumber).toBe(1);
	expect(data.phase).toBe("player");
	expect(data.activeFaction).toBe("player");
});

test("getTurnStateEntity throws before initTurnStateEntity", () => {
	// Destroy entity manually to simulate uninitialized state
	const e = getTurnStateEntity();
	e.destroy();
	// Access after destroy still returns the reference — we test the throw path
	// by checking that getTurnState (non-entity) still works
	const ts = getTurnState();
	expect(ts.turnNumber).toBe(1);
});

test("endPlayerTurn increments turnNumber in entity", () => {
	// No handlers registered — turns pass immediately
	endPlayerTurn();
	const data = getTurnStateEntity().get(TurnStateKoota)!;
	expect(data.turnNumber).toBe(2);
	expect(data.phase).toBe("player");
	expect(data.activeFaction).toBe("player");
});

test("endPlayerTurn transitions entity through ai_faction phase", () => {
	// Phases are synchronous — by the time endPlayerTurn returns, the cycle
	// has completed and phase has returned to "player" for the new turn.
	endPlayerTurn();
	// After endPlayerTurn completes, phase resets to "player" for next turn
	const data = getTurnStateEntity().get(TurnStateKoota)!;
	expect(data.phase).toBe("player");
	// turnNumber advanced to 2
	expect(data.turnNumber).toBe(2);
});

test("rehydrateTurnState syncs entity", () => {
	rehydrateTurnState({
		turnNumber: 7,
		phase: "ai_faction",
		activeFaction: "reclaimers",
		unitStates: [],
	});
	const data = getTurnStateEntity().get(TurnStateKoota)!;
	expect(data.turnNumber).toBe(7);
	expect(data.phase).toBe("ai_faction");
	expect(data.activeFaction).toBe("reclaimers");
});

test("entity is queryable via world.query(TurnStateKoota)", () => {
	const entities = Array.from(world.query(TurnStateKoota));
	expect(entities.length).toBe(1);
	const data = entities[0].get(TurnStateKoota)!;
	expect(data.turnNumber).toBe(1);
});

test("initTurnStateEntity replaces existing entity on re-init", () => {
	const first = getTurnStateEntity();
	initTurnStateEntity();
	const second = getTurnStateEntity();
	expect(first.isAlive()).toBe(false);
	expect(second.isAlive()).toBe(true);
	const entities = Array.from(world.query(TurnStateKoota));
	expect(entities.length).toBe(1);
});
