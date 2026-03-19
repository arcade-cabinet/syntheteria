import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WORMHOLE_PROJECT_TURNS } from "../../config/gameDefaults";
import { Board, Building, Faction } from "../../traits";
import { ResearchState } from "../researchSystem";
import {
	_resetWormholeProject,
	canStartWormholeProject,
	getWormholeProjectState,
	isValidWormholePlacement,
	onWormholeStabilizerPlaced,
	tickWormholeProject,
} from "../wormholeProject";

describe("wormholeProject", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		_resetWormholeProject();
	});

	afterEach(() => {
		world.destroy();
	});

	// ─── Helpers ────────────────────────────────────────────────────────

	function spawnBoard(width = 32, height = 32, turn = 1) {
		return world.spawn(
			Board({ width, height, seed: "test", tileSizeM: 2, turn }),
		);
	}

	function spawnFactionWithResearch(factionId: string, researched: string[]) {
		return world.spawn(
			Faction({
				id: factionId,
				displayName: factionId,
				color: 0xffffff,
				persona: "raven",
				isPlayer: false,
				aggression: 0,
			}),
			ResearchState({
				researchedTechs: researched.join(","),
				currentTechId: "",
				progressPoints: 0,
			}),
		);
	}

	function spawnStabilizer(factionId: string, tileX: number, tileZ: number) {
		return world.spawn(
			Building({
				tileX,
				tileZ,
				buildingType: "wormhole_stabilizer",
				modelId: "wormhole_stabilizer",
				factionId,
				hp: 200,
				maxHp: 200,
			}),
		);
	}

	// ─── Initial state ──────────────────────────────────────────────────

	describe("initial state", () => {
		it("starts inactive", () => {
			expect(getWormholeProjectState()).toEqual({ status: "inactive" });
		});
	});

	// ─── canStartWormholeProject ────────────────────────────────────────

	describe("canStartWormholeProject", () => {
		it("returns true when both tier-5 techs are researched", () => {
			spawnFactionWithResearch("player", [
				"mark_v_transcendence",
				"wormhole_stabilization",
			]);

			expect(canStartWormholeProject(world, "player")).toBe(true);
		});

		it("returns false when only one tier-5 tech is researched", () => {
			spawnFactionWithResearch("player", ["mark_v_transcendence"]);

			expect(canStartWormholeProject(world, "player")).toBe(false);
		});

		it("returns false when neither tier-5 tech is researched", () => {
			spawnFactionWithResearch("player", []);

			expect(canStartWormholeProject(world, "player")).toBe(false);
		});

		it("returns false when project is already building", () => {
			spawnFactionWithResearch("player", [
				"mark_v_transcendence",
				"wormhole_stabilization",
			]);
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			expect(canStartWormholeProject(world, "player")).toBe(false);
		});

		it("returns false when project is already completed", () => {
			spawnFactionWithResearch("player", [
				"mark_v_transcendence",
				"wormhole_stabilization",
			]);
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			// Fast-forward to completion
			for (let i = 0; i < WORMHOLE_PROJECT_TURNS; i++) {
				tickWormholeProject(world);
			}

			expect(getWormholeProjectState().status).toBe("completed");
			expect(canStartWormholeProject(world, "player")).toBe(false);
		});
	});

	// ─── isValidWormholePlacement ────────────────────────────────────────

	describe("isValidWormholePlacement", () => {
		it("accepts tile at board center", () => {
			spawnBoard(32, 32);
			// Center of 32×32 = (16, 16)
			expect(isValidWormholePlacement(world, 16, 16)).toBe(true);
		});

		it("accepts tile within 3 manhattan distance of center", () => {
			spawnBoard(32, 32);
			// Center = (16,16), manhattan 3 = (19,16)
			expect(isValidWormholePlacement(world, 19, 16)).toBe(true);
			// manhattan 3 = (17,18)
			expect(isValidWormholePlacement(world, 17, 18)).toBe(true);
		});

		it("rejects tile beyond 3 manhattan distance of center", () => {
			spawnBoard(32, 32);
			// manhattan 4 = (20,16)
			expect(isValidWormholePlacement(world, 20, 16)).toBe(false);
		});

		it("returns false when no board entity exists", () => {
			// No board spawned
			expect(isValidWormholePlacement(world, 10, 10)).toBe(false);
		});
	});

	// ─── onWormholeStabilizerPlaced ─────────────────────────────────────

	describe("onWormholeStabilizerPlaced", () => {
		it("transitions state to building with correct turnsRemaining", () => {
			spawnBoard(32, 32);
			const stabilizer = spawnStabilizer("player", 16, 16);

			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			const state = getWormholeProjectState();
			expect(state.status).toBe("building");
			if (state.status === "building") {
				expect(state.turnsRemaining).toBe(WORMHOLE_PROJECT_TURNS);
				expect(state.buildingEntityId).toBe(stabilizer.id());
				expect(state.startTurn).toBe(1);
			}
		});

		it("records the correct start turn from the board", () => {
			spawnBoard(32, 32, 15);
			const stabilizer = spawnStabilizer("player", 16, 16);

			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			const state = getWormholeProjectState();
			if (state.status === "building") {
				expect(state.startTurn).toBe(15);
			}
		});
	});

	// ─── tickWormholeProject ────────────────────────────────────────────

	describe("tickWormholeProject", () => {
		it("returns none when project is inactive", () => {
			spawnBoard();
			expect(tickWormholeProject(world)).toEqual({ event: "none" });
		});

		it("decrements turnsRemaining each tick", () => {
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			const result = tickWormholeProject(world);

			expect(result.event).toBe("progress");
			if (result.event === "progress") {
				expect(result.turnsRemaining).toBe(WORMHOLE_PROJECT_TURNS - 1);
			}

			const state = getWormholeProjectState();
			if (state.status === "building") {
				expect(state.turnsRemaining).toBe(WORMHOLE_PROJECT_TURNS - 1);
			}
		});

		it("completes after exactly WORMHOLE_PROJECT_TURNS ticks", () => {
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			// Tick all but last
			for (let i = 0; i < WORMHOLE_PROJECT_TURNS - 1; i++) {
				const result = tickWormholeProject(world);
				expect(result.event).toBe("progress");
			}

			// Final tick should complete
			const final = tickWormholeProject(world);
			expect(final).toEqual({ event: "completed" });
			expect(getWormholeProjectState().status).toBe("completed");
		});

		it("sets completionTurn on completion", () => {
			spawnBoard(32, 32, 10);
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			for (let i = 0; i < WORMHOLE_PROJECT_TURNS; i++) {
				tickWormholeProject(world);
			}

			const state = getWormholeProjectState();
			if (state.status === "completed") {
				expect(state.completionTurn).toBe(10);
			}
		});

		it("returns destroyed when stabilizer building is removed", () => {
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			// Destroy the building mid-project
			stabilizer.destroy();

			const result = tickWormholeProject(world);
			expect(result).toEqual({ event: "destroyed" });
			expect(getWormholeProjectState().status).toBe("destroyed");
		});

		it("returns destroyed when stabilizer building type changed", () => {
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			// Change the building type (simulate corruption)
			stabilizer.set(Building, {
				...stabilizer.get(Building)!,
				buildingType: "storage_hub",
			});

			const result = tickWormholeProject(world);
			expect(result).toEqual({ event: "destroyed" });
		});

		it("returns none after completion (no double-complete)", () => {
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			for (let i = 0; i < WORMHOLE_PROJECT_TURNS; i++) {
				tickWormholeProject(world);
			}

			// Extra ticks should do nothing
			expect(tickWormholeProject(world)).toEqual({ event: "none" });
		});

		it("returns none after destruction", () => {
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			stabilizer.destroy();
			tickWormholeProject(world);

			// Further ticks should return none
			expect(tickWormholeProject(world)).toEqual({ event: "none" });
		});
	});

	// ─── _resetWormholeProject ──────────────────────────────────────────

	describe("_resetWormholeProject", () => {
		it("resets to inactive from any state", () => {
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");
			expect(getWormholeProjectState().status).toBe("building");

			_resetWormholeProject();
			expect(getWormholeProjectState()).toEqual({ status: "inactive" });
		});

		it("allows re-starting project after reset", () => {
			spawnFactionWithResearch("player", [
				"mark_v_transcendence",
				"wormhole_stabilization",
			]);
			spawnBoard();
			const stabilizer = spawnStabilizer("player", 16, 16);
			onWormholeStabilizerPlaced(world, stabilizer.id(), "player");

			// Complete it
			for (let i = 0; i < WORMHOLE_PROJECT_TURNS; i++) {
				tickWormholeProject(world);
			}
			expect(getWormholeProjectState().status).toBe("completed");
			expect(canStartWormholeProject(world, "player")).toBe(false);

			// Reset and verify can start again
			_resetWormholeProject();
			expect(canStartWormholeProject(world, "player")).toBe(true);
		});
	});
});
