/**
 * Unit tests for the AI peace period / pacing system.
 *
 * Tests cover:
 * - Faction registration with different difficulties
 * - Phase transitions at correct game-time thresholds
 * - updatePacing advances through all phases
 * - canRaid respects phase restrictions and cooldowns
 * - recordRaid sets cooldown
 * - getAggressionLevel ramps correctly within phases
 * - isInPeacePeriod
 * - forcePhase overrides normal progression
 * - Different difficulties have different timing
 * - reset clears everything
 */

import {
	type AIPhase,
	canRaid,
	forcePhase,
	getAggressionLevel,
	getAllFactionPacings,
	getCurrentPhase,
	getFactionPacing,
	isInPeacePeriod,
	recordRaid,
	registerFaction,
	reset,
	updatePacing,
} from "../aiPeacePeriod";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — registration", () => {
	it("registers a faction with normal difficulty", () => {
		registerFaction("reclaimers", "normal");
		const pacing = getFactionPacing("reclaimers");

		expect(pacing).not.toBeNull();
		expect(pacing!.factionId).toBe("reclaimers");
		expect(pacing!.currentPhase).toBe("peace");
		expect(pacing!.aggressionLevel).toBe(0);
		expect(pacing!.peaceExpired).toBe(false);
		expect(pacing!.totalRaidsLaunched).toBe(0);
	});

	it("registers factions with different difficulties", () => {
		registerFaction("f1", "easy");
		registerFaction("f2", "hard");
		registerFaction("f3", "brutal");

		expect(getFactionPacing("f1")).not.toBeNull();
		expect(getFactionPacing("f2")).not.toBeNull();
		expect(getFactionPacing("f3")).not.toBeNull();
	});

	it("throws on unknown difficulty", () => {
		expect(() => registerFaction("f1", "nightmare")).toThrow(
			"Unknown difficulty",
		);
	});

	it("returns null for unregistered faction", () => {
		expect(getFactionPacing("nonexistent")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Phase transitions — normal difficulty
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — phase transitions (normal)", () => {
	// Normal: peace=300, scouting=180, contested=300, warfare=600, endgame=∞

	it("stays in peace phase before 300s", () => {
		registerFaction("f1", "normal");
		updatePacing(299);
		expect(getCurrentPhase("f1")).toBe("peace");
	});

	it("transitions from peace to scouting at 300s", () => {
		registerFaction("f1", "normal");
		updatePacing(300);
		expect(getCurrentPhase("f1")).toBe("scouting");
	});

	it("transitions from scouting to contested at 480s", () => {
		registerFaction("f1", "normal");
		// peace(300) + scouting(180) = 480
		updatePacing(480);
		expect(getCurrentPhase("f1")).toBe("contested");
	});

	it("transitions from contested to warfare at 780s", () => {
		registerFaction("f1", "normal");
		// peace(300) + scouting(180) + contested(300) = 780
		updatePacing(780);
		expect(getCurrentPhase("f1")).toBe("warfare");
	});

	it("transitions from warfare to endgame at 1380s", () => {
		registerFaction("f1", "normal");
		// peace(300) + scouting(180) + contested(300) + warfare(600) = 1380
		updatePacing(1380);
		expect(getCurrentPhase("f1")).toBe("endgame");
	});

	it("endgame persists indefinitely on normal", () => {
		registerFaction("f1", "normal");
		updatePacing(1380);
		expect(getCurrentPhase("f1")).toBe("endgame");

		updatePacing(99999);
		expect(getCurrentPhase("f1")).toBe("endgame");
	});
});

// ---------------------------------------------------------------------------
// Phase transitions — different difficulties
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — difficulty timing", () => {
	it("easy has 600s peace period", () => {
		registerFaction("f1", "easy");
		updatePacing(599);
		expect(getCurrentPhase("f1")).toBe("peace");

		updatePacing(600);
		expect(getCurrentPhase("f1")).toBe("scouting");
	});

	it("hard has 120s peace period", () => {
		registerFaction("f1", "hard");
		updatePacing(119);
		expect(getCurrentPhase("f1")).toBe("peace");

		updatePacing(120);
		expect(getCurrentPhase("f1")).toBe("scouting");
	});

	it("brutal has 60s peace period", () => {
		registerFaction("f1", "brutal");
		updatePacing(59);
		expect(getCurrentPhase("f1")).toBe("peace");

		updatePacing(60);
		expect(getCurrentPhase("f1")).toBe("scouting");
	});

	it("brutal reaches endgame much sooner than easy", () => {
		registerFaction("brutal_f", "brutal");
		registerFaction("easy_f", "easy");

		// Brutal: 60+60+60+120 = 300
		updatePacing(300);
		expect(getCurrentPhase("brutal_f")).toBe("endgame");
		expect(getCurrentPhase("easy_f")).toBe("peace"); // easy still in peace at 300
	});
});

// ---------------------------------------------------------------------------
// updatePacing — progressive advancement
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — updatePacing progression", () => {
	it("advances through all phases in sequence", () => {
		registerFaction("f1", "brutal");
		// brutal: peace=60, scouting=60, contested=60, warfare=120, endgame=300

		const expectedPhases: [number, AIPhase][] = [
			[0, "peace"],
			[30, "peace"],
			[60, "scouting"],
			[90, "scouting"],
			[120, "contested"],
			[150, "contested"],
			[180, "warfare"],
			[250, "warfare"],
			[300, "endgame"],
			[500, "endgame"],
		];

		for (const [time, expected] of expectedPhases) {
			updatePacing(time);
			expect(getCurrentPhase("f1")).toBe(expected);
		}
	});

	it("sets peaceExpired when leaving peace phase", () => {
		registerFaction("f1", "normal");
		updatePacing(299);
		expect(getFactionPacing("f1")!.peaceExpired).toBe(false);

		updatePacing(300);
		expect(getFactionPacing("f1")!.peaceExpired).toBe(true);
	});

	it("handles multiple factions independently", () => {
		registerFaction("f1", "easy");
		registerFaction("f2", "brutal");

		updatePacing(60);
		expect(getCurrentPhase("f1")).toBe("peace"); // easy peace = 600
		expect(getCurrentPhase("f2")).toBe("scouting"); // brutal peace = 60
	});
});

// ---------------------------------------------------------------------------
// canRaid
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — canRaid", () => {
	it("cannot raid during peace phase", () => {
		registerFaction("f1", "normal");
		updatePacing(100);
		expect(canRaid("f1", 100)).toBe(false);
	});

	it("cannot raid during scouting phase", () => {
		registerFaction("f1", "normal");
		updatePacing(400); // in scouting (300-480)
		expect(canRaid("f1", 400)).toBe(false);
	});

	it("can raid during contested phase", () => {
		registerFaction("f1", "normal");
		updatePacing(500); // in contested (480-780)
		expect(canRaid("f1", 500)).toBe(true);
	});

	it("can raid during warfare phase", () => {
		registerFaction("f1", "normal");
		updatePacing(800); // in warfare (780-1380)
		expect(canRaid("f1", 800)).toBe(true);
	});

	it("can raid during endgame phase", () => {
		registerFaction("f1", "normal");
		updatePacing(1400); // in endgame (1380+)
		expect(canRaid("f1", 1400)).toBe(true);
	});

	it("respects contested cooldown of 300s", () => {
		registerFaction("f1", "normal");
		updatePacing(500); // contested

		recordRaid("f1", 500);
		expect(canRaid("f1", 500)).toBe(false);
		expect(canRaid("f1", 799)).toBe(false);
		expect(canRaid("f1", 800)).toBe(true);
	});

	it("respects warfare cooldown of 180s", () => {
		registerFaction("f1", "normal");
		updatePacing(800); // warfare

		recordRaid("f1", 800);
		expect(canRaid("f1", 800)).toBe(false);
		expect(canRaid("f1", 979)).toBe(false);
		expect(canRaid("f1", 980)).toBe(true);
	});

	it("respects endgame cooldown of 60s", () => {
		registerFaction("f1", "normal");
		updatePacing(1400); // endgame

		recordRaid("f1", 1400);
		expect(canRaid("f1", 1400)).toBe(false);
		expect(canRaid("f1", 1459)).toBe(false);
		expect(canRaid("f1", 1460)).toBe(true);
	});

	it("returns false for unregistered faction", () => {
		expect(canRaid("unknown", 100)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// recordRaid
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — recordRaid", () => {
	it("records raid time and increments counter", () => {
		registerFaction("f1", "normal");
		updatePacing(500);

		recordRaid("f1", 500);
		const pacing = getFactionPacing("f1");
		expect(pacing!.lastRaidTime).toBe(500);
		expect(pacing!.totalRaidsLaunched).toBe(1);
	});

	it("increments counter across multiple raids", () => {
		registerFaction("f1", "normal");
		updatePacing(500);

		recordRaid("f1", 500);
		recordRaid("f1", 800);
		recordRaid("f1", 1100);

		const pacing = getFactionPacing("f1");
		expect(pacing!.totalRaidsLaunched).toBe(3);
		expect(pacing!.lastRaidTime).toBe(1100);
	});

	it("does nothing for unregistered faction", () => {
		// Should not throw
		expect(() => recordRaid("unknown", 100)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getAggressionLevel
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — aggression ramp", () => {
	it("aggression is 0 at start of peace", () => {
		registerFaction("f1", "normal");
		updatePacing(0);
		expect(getAggressionLevel("f1")).toBe(0);
	});

	it("aggression ramps during peace toward scouting base", () => {
		registerFaction("f1", "normal");
		// Normal peace = 300s. Midpoint = 150s.
		// Ramp from 0 (peace base) to 0.15 (scouting base).
		// At 150s: 0 + (0.15 - 0) * (150/300) = 0.075
		updatePacing(150);
		expect(getAggressionLevel("f1")).toBeCloseTo(0.075, 3);
	});

	it("aggression ramps during scouting toward contested base", () => {
		registerFaction("f1", "normal");
		// At scouting start (300s): base = 0.15
		// Scouting duration = 180, ramp to 0.4 (contested base)
		// At midpoint of scouting (300 + 90 = 390s):
		// 0.15 + (0.4 - 0.15) * (90/180) = 0.15 + 0.125 = 0.275
		updatePacing(390);
		expect(getAggressionLevel("f1")).toBeCloseTo(0.275, 3);
	});

	it("aggression reaches 1.0 in endgame", () => {
		registerFaction("f1", "normal");
		// Endgame base = 1.0
		updatePacing(1380); // start of endgame
		expect(getAggressionLevel("f1")).toBeCloseTo(1.0, 3);
	});

	it("returns 0 for unregistered faction", () => {
		expect(getAggressionLevel("unknown")).toBe(0);
	});

	it("aggression is monotonically non-decreasing over time", () => {
		registerFaction("f1", "hard");
		let prev = 0;
		for (let t = 0; t <= 1000; t += 10) {
			updatePacing(t);
			const level = getAggressionLevel("f1");
			expect(level).toBeGreaterThanOrEqual(prev);
			prev = level;
		}
	});
});

// ---------------------------------------------------------------------------
// isInPeacePeriod
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — isInPeacePeriod", () => {
	it("returns true during peace phase", () => {
		registerFaction("f1", "normal");
		updatePacing(100);
		expect(isInPeacePeriod("f1")).toBe(true);
	});

	it("returns false after peace phase", () => {
		registerFaction("f1", "normal");
		updatePacing(300);
		expect(isInPeacePeriod("f1")).toBe(false);
	});

	it("returns true for unregistered faction (safe default)", () => {
		expect(isInPeacePeriod("unknown")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// forcePhase
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — forcePhase", () => {
	it("overrides phase to warfare", () => {
		registerFaction("f1", "easy");
		updatePacing(10); // still in peace

		forcePhase("f1", "warfare", 10);
		expect(getCurrentPhase("f1")).toBe("warfare");
	});

	it("sets peaceExpired when forced out of peace", () => {
		registerFaction("f1", "easy");
		forcePhase("f1", "contested", 5);
		expect(getFactionPacing("f1")!.peaceExpired).toBe(true);
	});

	it("updates phaseStartTime to the force time", () => {
		registerFaction("f1", "normal");
		forcePhase("f1", "warfare", 42);
		expect(getFactionPacing("f1")!.phaseStartTime).toBe(42);
	});

	it("resets aggression to the forced phase base", () => {
		registerFaction("f1", "normal");
		forcePhase("f1", "warfare", 100);
		// Warfare base = 0.7
		expect(getAggressionLevel("f1")).toBeCloseTo(0.7, 3);
	});

	it("allows raiding if forced into contested", () => {
		registerFaction("f1", "easy");
		forcePhase("f1", "contested", 10);
		expect(canRaid("f1", 10)).toBe(true);
	});

	it("normal progression continues from forced phase", () => {
		registerFaction("f1", "brutal");
		// Brutal contested = 60s
		forcePhase("f1", "contested", 100);
		updatePacing(160); // 60s into contested → should transition to warfare
		expect(getCurrentPhase("f1")).toBe("warfare");
	});

	it("does nothing for unregistered faction", () => {
		expect(() => forcePhase("unknown", "warfare", 0)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getAllFactionPacings
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — getAllFactionPacings", () => {
	it("returns empty array when no factions registered", () => {
		expect(getAllFactionPacings()).toHaveLength(0);
	});

	it("returns all registered factions", () => {
		registerFaction("f1", "easy");
		registerFaction("f2", "hard");
		registerFaction("f3", "brutal");

		const all = getAllFactionPacings();
		expect(all).toHaveLength(3);
		const ids = all.map((p) => p.factionId).sort();
		expect(ids).toEqual(["f1", "f2", "f3"]);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — reset", () => {
	it("clears all registered factions", () => {
		registerFaction("f1", "normal");
		registerFaction("f2", "hard");

		reset();

		expect(getFactionPacing("f1")).toBeNull();
		expect(getFactionPacing("f2")).toBeNull();
		expect(getAllFactionPacings()).toHaveLength(0);
	});

	it("allows re-registration after reset", () => {
		registerFaction("f1", "normal");
		updatePacing(500);
		reset();

		registerFaction("f1", "easy");
		expect(getCurrentPhase("f1")).toBe("peace");
		expect(getAggressionLevel("f1")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("aiPeacePeriod — edge cases", () => {
	it("getCurrentPhase returns peace for unregistered faction", () => {
		expect(getCurrentPhase("unknown")).toBe("peace");
	});

	it("handles updatePacing called with same time twice", () => {
		registerFaction("f1", "normal");
		updatePacing(300);
		updatePacing(300);
		expect(getCurrentPhase("f1")).toBe("scouting");
	});

	it("handles large time jumps that skip multiple phases", () => {
		registerFaction("f1", "brutal");
		// brutal total before endgame: 60+60+60+120 = 300
		updatePacing(300);
		expect(getCurrentPhase("f1")).toBe("endgame");
	});
});
