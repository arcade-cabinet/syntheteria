import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getRelation,
	getStanding,
	modifyStanding,
	setRelation,
	setStanding,
} from "../../factions/relations";
import { FactionRelation } from "../../traits/faction";
import { Tile } from "../../traits/tile";
import { UnitFaction, UnitPos, UnitStats } from "../../traits/unit";
import {
	_resetDiplomacy,
	applyBreakPenalty,
	applyDiplomacyEvent,
	calculateTradeIncome,
	declareWar,
	getDiplomacyPersonality,
	getRecentDiplomacyEvents,
	getStandingDisplay,
	getStandingLevel,
	isAlly,
	proposeAlliance,
	recordAggression,
	runDiplomacy,
	shareAlliedFog,
} from "../diplomacySystem";

describe("diplomacySystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		_resetDiplomacy();
	});

	afterEach(() => {
		world.destroy();
	});

	describe("recordAggression", () => {
		it("shifts neutral relation to hostile on attack", () => {
			expect(getRelation(world, "player", "reclaimers")).toBe("neutral");

			recordAggression(world, "player", "reclaimers", 1);

			expect(getRelation(world, "player", "reclaimers")).toBe("hostile");
		});

		it("breaks an alliance immediately on attack", () => {
			setRelation(world, "player", "reclaimers", "ally");
			expect(getRelation(world, "player", "reclaimers")).toBe("ally");

			recordAggression(world, "player", "reclaimers", 5);

			expect(getRelation(world, "player", "reclaimers")).toBe("hostile");
		});

		it("ignores same-faction aggression", () => {
			recordAggression(world, "player", "player", 1);
			expect(getRelation(world, "player", "player")).toBe("neutral");
		});

		it("does not change already hostile relation", () => {
			setRelation(world, "player", "iron_creed", "hostile");
			recordAggression(world, "player", "iron_creed", 5);
			expect(getRelation(world, "player", "iron_creed")).toBe("hostile");
		});
	});

	describe("proposeAlliance", () => {
		it("Reclaimers accept alliance proposals", () => {
			const accepted = proposeAlliance(world, "player", "reclaimers", 1);
			expect(accepted).toBe(true);
			expect(getRelation(world, "player", "reclaimers")).toBe("ally");
		});

		it("Volt Collective accepts alliance proposals", () => {
			const accepted = proposeAlliance(world, "player", "volt_collective", 1);
			expect(accepted).toBe(true);
			expect(getRelation(world, "player", "volt_collective")).toBe("ally");
		});

		it("Iron Creed rejects alliance proposals", () => {
			const accepted = proposeAlliance(world, "player", "iron_creed", 1);
			expect(accepted).toBe(false);
			expect(getRelation(world, "player", "iron_creed")).toBe("neutral");
		});

		it("Signal Choir accepts alliance (but will backstab later)", () => {
			const accepted = proposeAlliance(world, "player", "signal_choir", 1);
			expect(accepted).toBe(true);
			expect(getRelation(world, "player", "signal_choir")).toBe("ally");
		});

		it("rejects alliance when relation is hostile", () => {
			setRelation(world, "player", "reclaimers", "hostile");
			const accepted = proposeAlliance(world, "player", "reclaimers", 1);
			expect(accepted).toBe(false);
		});

		it("rejects alliance for unknown factions", () => {
			const accepted = proposeAlliance(world, "player", "unknown_faction", 1);
			expect(accepted).toBe(false);
		});
	});

	describe("declareWar", () => {
		it("sets relation to hostile", () => {
			declareWar(world, "player", "reclaimers", 1);
			expect(getRelation(world, "player", "reclaimers")).toBe("hostile");
		});

		it("breaks an existing alliance", () => {
			setRelation(world, "player", "volt_collective", "ally");
			declareWar(world, "player", "volt_collective", 5);
			expect(getRelation(world, "player", "volt_collective")).toBe("hostile");
		});
	});

	describe("runDiplomacy — peace drift", () => {
		it("drifts hostile to neutral after 10 turns of peace", () => {
			const factions = ["player", "reclaimers"];
			setRelation(world, "player", "reclaimers", "hostile");

			// Turn 1: aggression recorded
			recordAggression(world, "player", "reclaimers", 1);

			// Turn 10: not enough time has passed
			runDiplomacy(world, 10, factions);
			expect(getRelation(world, "player", "reclaimers")).toBe("hostile");

			// Turn 11: 10 turns since last aggression at turn 1
			runDiplomacy(world, 11, factions);
			expect(getRelation(world, "player", "reclaimers")).toBe("neutral");
		});

		it("resets drift timer on new aggression", () => {
			const factions = ["player", "reclaimers"];
			recordAggression(world, "player", "reclaimers", 1);

			// New aggression at turn 5
			recordAggression(world, "player", "reclaimers", 5);

			// Turn 11: only 6 turns since last aggression — still hostile
			runDiplomacy(world, 11, factions);
			expect(getRelation(world, "player", "reclaimers")).toBe("hostile");

			// Turn 15: 10 turns since aggression at turn 5
			runDiplomacy(world, 15, factions);
			expect(getRelation(world, "player", "reclaimers")).toBe("neutral");
		});
	});

	describe("runDiplomacy — Signal Choir backstab", () => {
		it("Signal Choir breaks alliance after 15 turns", () => {
			const factions = ["player", "signal_choir"];
			proposeAlliance(world, "player", "signal_choir", 10);
			expect(getRelation(world, "player", "signal_choir")).toBe("ally");

			// Turn 24: not yet (14 turns since formation at turn 10)
			runDiplomacy(world, 24, factions);
			expect(getRelation(world, "player", "signal_choir")).toBe("ally");

			// Turn 25: exactly 15 turns since formation
			runDiplomacy(world, 25, factions);
			expect(getRelation(world, "player", "signal_choir")).toBe("hostile");
		});

		it("Reclaimers do not backstab", () => {
			const factions = ["player", "reclaimers"];
			proposeAlliance(world, "player", "reclaimers", 1);

			// Run many turns — alliance holds
			for (let t = 2; t <= 50; t++) {
				runDiplomacy(world, t, factions);
			}
			expect(getRelation(world, "player", "reclaimers")).toBe("ally");
		});
	});

	describe("shareAlliedFog", () => {
		it("shareAlliedFog is a no-op when all tiles are already explored", () => {
			// All tiles start explored — shareAlliedFog runs without error
			for (let x = 0; x < 5; x++) {
				for (let z = 0; z < 5; z++) {
					world.spawn(Tile({ x, z, explored: true, visibility: 1 }));
				}
			}

			setRelation(world, "player", "volt_collective", "ally");
			world.spawn(
				UnitPos({ tileX: 2, tileZ: 2 }),
				UnitFaction({ factionId: "volt_collective" }),
				UnitStats({
					hp: 5,
					maxHp: 5,
					ap: 2,
					maxAp: 2,
					scanRange: 1,
					attack: 1,
					defense: 1,
					attackRange: 1,
				}),
			);

			shareAlliedFog(world, "player");

			// All tiles remain explored
			for (const e of world.query(Tile)) {
				const t = e.get(Tile);
				if (t) expect(t.explored).toBe(true);
			}
		});
	});

	describe("isAlly", () => {
		it("returns true for allied factions", () => {
			setRelation(world, "player", "reclaimers", "ally");
			expect(isAlly(world, "player", "reclaimers")).toBe(true);
		});

		it("returns false for neutral factions", () => {
			expect(isAlly(world, "player", "reclaimers")).toBe(false);
		});

		it("returns false for hostile factions", () => {
			setRelation(world, "player", "reclaimers", "hostile");
			expect(isAlly(world, "player", "reclaimers")).toBe(false);
		});
	});

	describe("getDiplomacyPersonality", () => {
		it("returns personality for known factions", () => {
			const p = getDiplomacyPersonality("signal_choir");
			expect(p).not.toBeNull();
			expect(p!.willBackstab).toBe(true);
		});

		it("returns null for unknown factions", () => {
			expect(getDiplomacyPersonality("unknown")).toBeNull();
		});
	});

	// ─── NEW: Granular standings ──────────────────────────────────────────

	describe("granular standings", () => {
		it("standing starts at 0 for new faction pairs", () => {
			expect(getStanding(world, "player", "reclaimers")).toBe(0);
		});

		it("standing for same faction is always 100", () => {
			expect(getStanding(world, "player", "player")).toBe(100);
		});

		it("modifyStanding changes the standing value", () => {
			modifyStanding(world, "player", "reclaimers", 25);
			expect(getStanding(world, "player", "reclaimers")).toBe(25);
		});

		it("modifyStanding clamps to [-100, 100]", () => {
			modifyStanding(world, "player", "reclaimers", 150);
			expect(getStanding(world, "player", "reclaimers")).toBe(100);

			modifyStanding(world, "player", "reclaimers", -300);
			expect(getStanding(world, "player", "reclaimers")).toBe(-100);
		});

		it("setStanding forces an exact value", () => {
			setStanding(world, "player", "reclaimers", 75);
			expect(getStanding(world, "player", "reclaimers")).toBe(75);
		});

		it("proposeAlliance sets standing to 60", () => {
			proposeAlliance(world, "player", "reclaimers", 1);
			expect(getStanding(world, "player", "reclaimers")).toBe(60);
		});

		it("recordAggression on neutral sets standing to -60", () => {
			recordAggression(world, "player", "reclaimers", 1);
			expect(getStanding(world, "player", "reclaimers")).toBe(-60);
		});

		it("recordAggression on hostile deepens standing further", () => {
			setRelation(world, "player", "iron_creed", "hostile");
			// standing is now -60 (from setRelation default)
			recordAggression(world, "player", "iron_creed", 5);
			// Should be -60 + (-20) = -80
			expect(getStanding(world, "player", "iron_creed")).toBe(-80);
		});
	});

	describe("standing level", () => {
		it("returns correct levels for various standings", () => {
			setStanding(world, "player", "reclaimers", -75);
			expect(getStandingLevel(world, "player", "reclaimers")).toBe("hostile");

			setStanding(world, "player", "reclaimers", -25);
			expect(getStandingLevel(world, "player", "reclaimers")).toBe(
				"unfriendly",
			);

			setStanding(world, "player", "reclaimers", 0);
			expect(getStandingLevel(world, "player", "reclaimers")).toBe("neutral");

			setStanding(world, "player", "reclaimers", 30);
			expect(getStandingLevel(world, "player", "reclaimers")).toBe("cordial");

			setStanding(world, "player", "reclaimers", 75);
			expect(getStandingLevel(world, "player", "reclaimers")).toBe("allied");
		});
	});

	describe("standing display", () => {
		it("returns label and color for a standing level", () => {
			setStanding(world, "player", "reclaimers", -75);
			const display = getStandingDisplay(world, "player", "reclaimers");
			expect(display.label).toBe("Hostile");
			expect(display.color).toBe("#cc4444");
			expect(display.value).toBe(-75);
		});
	});

	// ─── NEW: Standing decay ──────────────────────────────────────────────

	describe("standing decay", () => {
		it("positive standing decays toward 0 each turn", () => {
			setStanding(world, "player", "reclaimers", 5);
			// Ensure relation doesn't interfere — manually set to neutral
			setRelation(world, "player", "reclaimers", "neutral");

			runDiplomacy(world, 1, ["player", "reclaimers"]);
			expect(getStanding(world, "player", "reclaimers")).toBe(4);
		});

		it("negative standing decays toward 0 each turn", () => {
			setStanding(world, "player", "reclaimers", -5);
			setRelation(world, "player", "reclaimers", "neutral");

			runDiplomacy(world, 1, ["player", "reclaimers"]);
			expect(getStanding(world, "player", "reclaimers")).toBe(-4);
		});

		it("standing at 0 does not change", () => {
			setStanding(world, "player", "reclaimers", 0);

			runDiplomacy(world, 1, ["player", "reclaimers"]);
			expect(getStanding(world, "player", "reclaimers")).toBe(0);
		});
	});

	// ─── NEW: Break penalties ─────────────────────────────────────────────

	describe("break penalties", () => {
		it("alliance break penalizes standing with all factions", () => {
			const factions = [
				"player",
				"reclaimers",
				"volt_collective",
				"signal_choir",
				"iron_creed",
			];
			// Set initial neutral standing with all
			for (const f of factions) {
				if (f === "player") continue;
				setStanding(world, "player", f, 0);
			}

			// Break alliance with reclaimers — should penalize ALL factions
			applyBreakPenalty(world, "player", "reclaimers", 5, true);

			// Reclaimers gets double penalty (-80)
			expect(getStanding(world, "player", "reclaimers")).toBe(-80);
			// Others get single penalty (-40)
			expect(getStanding(world, "player", "volt_collective")).toBe(-40);
			expect(getStanding(world, "player", "signal_choir")).toBe(-40);
			expect(getStanding(world, "player", "iron_creed")).toBe(-40);
		});

		it("trade break uses smaller penalty", () => {
			setStanding(world, "player", "reclaimers", 0);
			setStanding(world, "player", "volt_collective", 0);

			applyBreakPenalty(world, "player", "reclaimers", 5, false);

			// Reclaimers gets double trade break penalty (-40)
			expect(getStanding(world, "player", "reclaimers")).toBe(-40);
			// Others get single trade break penalty (-20)
			expect(getStanding(world, "player", "volt_collective")).toBe(-20);
		});
	});

	// ─── NEW: Trade income ────────────────────────────────────────────────

	describe("trade income", () => {
		it("allied factions share harvest income", () => {
			setRelation(world, "player", "reclaimers", "ally");

			const harvests = new Map([
				["player", 100],
				["reclaimers", 200],
			]);

			const incomes = calculateTradeIncome(world, harvests);
			// Player gets 15% of reclaimers' 200 = 30
			// Reclaimers gets 15% of player's 100 = 15
			const playerIncome = incomes.find((i) => i.factionId === "player");
			const reclaimerIncome = incomes.find((i) => i.factionId === "reclaimers");

			expect(playerIncome).toBeDefined();
			expect(playerIncome!.incomeShared).toBe(30);
			expect(reclaimerIncome).toBeDefined();
			expect(reclaimerIncome!.incomeShared).toBe(15);
		});

		it("non-allied factions do not share income", () => {
			// Default is neutral
			const harvests = new Map([
				["player", 100],
				["reclaimers", 200],
			]);

			const incomes = calculateTradeIncome(world, harvests);
			expect(incomes).toHaveLength(0);
		});
	});

	// ─── NEW: Event history ───────────────────────────────────────────────

	describe("diplomacy event history", () => {
		it("recordAggression adds events to history", () => {
			recordAggression(world, "player", "reclaimers", 1);
			const events = getRecentDiplomacyEvents();
			expect(events.length).toBeGreaterThan(0);
			expect(events[0]!.type).toBe("unit_attacked");
			expect(events[0]!.factionA).toBe("player");
			expect(events[0]!.factionB).toBe("reclaimers");
		});

		it("applyDiplomacyEvent records typed events", () => {
			applyDiplomacyEvent(world, "trade_completed", "player", "reclaimers", 3);
			const events = getRecentDiplomacyEvents();
			const tradeEvent = events.find((e) => e.type === "trade_completed");
			expect(tradeEvent).toBeDefined();
			expect(tradeEvent!.standingChange).toBe(5);
		});

		it("_resetDiplomacy clears event history", () => {
			recordAggression(world, "player", "reclaimers", 1);
			expect(getRecentDiplomacyEvents().length).toBeGreaterThan(0);

			_resetDiplomacy();
			expect(getRecentDiplomacyEvents()).toHaveLength(0);
		});
	});
});
