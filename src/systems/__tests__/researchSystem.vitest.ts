import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TECH_BY_ID, TECH_TREE } from "../../config/techTreeDefs";
import { Building, Faction, Powered } from "../../traits";
import {
	cancelResearch,
	countResearchLabs,
	getAvailableTechs,
	getResearchState,
	getTechEffectValue,
	hasTechEffect,
	isTechResearched,
	queueResearch,
	ResearchState,
	runResearch,
} from "../researchSystem";

// Suppress playSfx / pushTurnEvent side effects in tests
vi.mock("../../audio/sfx", () => ({ playSfx: vi.fn() }));
vi.mock("../../ui/game/turnEvents", () => ({ pushTurnEvent: vi.fn() }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

let world: ReturnType<typeof createWorld>;

beforeEach(() => {
	world = createWorld();
});

afterEach(() => {
	world.destroy();
});

function spawnFaction(
	factionId: string,
	researched = "",
	currentTechId = "",
	progressPoints = 0,
) {
	return world.spawn(
		Faction({
			id: factionId,
			displayName: factionId,
			color: 0xffffff,
			persona: "otter",
			isPlayer: false,
			aggression: 0,
		}),
		ResearchState({
			researchedTechs: researched,
			currentTechId,
			progressPoints,
		}),
	);
}

function spawnResearchLab(factionId: string, powered = true) {
	const entity = world.spawn(
		Building({
			tileX: 0,
			tileZ: 0,
			buildingType: "analysis_node",
			modelId: "",
			factionId,
			hp: 50,
			maxHp: 50,
		}),
	);
	if (powered) entity.add(Powered);
	return entity;
}

// ─── countResearchLabs ────────────────────────────────────────────────────────

describe("countResearchLabs", () => {
	it("returns 0 when no labs exist", () => {
		spawnFaction("player");
		expect(countResearchLabs(world, "player")).toBe(0);
	});

	it("counts only powered research labs for the correct faction", () => {
		spawnResearchLab("player", true);
		spawnResearchLab("player", true);
		spawnResearchLab("player", false); // unpowered — should NOT count
		spawnResearchLab("enemy", true); // wrong faction
		expect(countResearchLabs(world, "player")).toBe(2);
	});
});

// ─── getResearchState ─────────────────────────────────────────────────────────

describe("getResearchState", () => {
	it("returns null for unknown faction", () => {
		expect(getResearchState(world, "nonexistent")).toBeNull();
	});

	it("returns parsed state for a faction", () => {
		spawnFaction(
			"player",
			"advanced_harvesting,signal_amplification",
			"reinforced_chassis",
			2,
		);
		spawnResearchLab("player", true);

		const state = getResearchState(world, "player");
		expect(state).not.toBeNull();
		expect(state!.researchedTechs).toEqual([
			"advanced_harvesting",
			"signal_amplification",
		]);
		expect(state!.currentTechId).toBe("reinforced_chassis");
		expect(state!.progressPoints).toBe(2);
		expect(state!.labCount).toBe(1);
	});

	it("returns empty array for no researched techs", () => {
		spawnFaction("player");
		const state = getResearchState(world, "player");
		expect(state!.researchedTechs).toEqual([]);
	});
});

// ─── getAvailableTechs ────────────────────────────────────────────────────────

describe("getAvailableTechs", () => {
	it("returns tier 1 techs when nothing is researched", () => {
		spawnFaction("player");

		const available = getAvailableTechs(world, "player");
		const ids = available.map((t) => t.id);

		// All tier 1 techs have no prerequisites
		const tier1 = TECH_TREE.filter((t) => t.tier === 1);
		for (const t of tier1) {
			expect(ids).toContain(t.id);
		}
	});

	it("unlocks tier 2 techs when prerequisites are met", () => {
		// reinforced_chassis is a prereq for storm_shielding and mark_ii_components
		spawnFaction("player", "reinforced_chassis");

		const available = getAvailableTechs(world, "player");
		const ids = available.map((t) => t.id);

		expect(ids).toContain("storm_shielding");
		expect(ids).toContain("mark_ii_components");
		// reinforced_chassis itself should NOT be available (already researched)
		expect(ids).not.toContain("reinforced_chassis");
	});

	it("does not unlock techs with unmet prerequisites", () => {
		spawnFaction("player", "advanced_harvesting");

		const available = getAvailableTechs(world, "player");
		const ids = available.map((t) => t.id);

		// deep_mining requires both efficient_fabrication AND advanced_harvesting
		expect(ids).not.toContain("deep_mining");
		// efficient_fabrication requires only advanced_harvesting — should be available
		expect(ids).toContain("efficient_fabrication");
	});

	it("returns empty for unknown faction", () => {
		expect(getAvailableTechs(world, "ghost")).toEqual([]);
	});
});

// ─── queueResearch ────────────────────────────────────────────────────────────

describe("queueResearch", () => {
	it("queues a tier 1 tech with no prerequisites", () => {
		spawnFaction("player");

		const result = queueResearch(world, "player", "advanced_harvesting");
		expect(result).toEqual({ ok: true });

		const state = getResearchState(world, "player");
		expect(state!.currentTechId).toBe("advanced_harvesting");
		expect(state!.progressPoints).toBe(0);
	});

	it("rejects unknown tech", () => {
		spawnFaction("player");

		const result = queueResearch(world, "player", "nonexistent_tech");
		expect(result).toEqual({ ok: false, reason: "no_such_tech" });
	});

	it("rejects if already researching", () => {
		spawnFaction("player", "", "advanced_harvesting", 1);

		const result = queueResearch(world, "player", "signal_amplification");
		expect(result).toEqual({ ok: false, reason: "already_researching" });
	});

	it("rejects already researched tech", () => {
		spawnFaction("player", "advanced_harvesting");

		const result = queueResearch(world, "player", "advanced_harvesting");
		expect(result).toEqual({ ok: false, reason: "already_researched" });
	});

	it("rejects tech with unmet prerequisites", () => {
		spawnFaction("player");

		// storm_shielding requires reinforced_chassis
		const result = queueResearch(world, "player", "storm_shielding");
		expect(result).toEqual({ ok: false, reason: "prerequisites_not_met" });
	});

	it("accepts tech when prerequisites are met", () => {
		spawnFaction("player", "reinforced_chassis");

		const result = queueResearch(world, "player", "storm_shielding");
		expect(result).toEqual({ ok: true });
	});

	it("rejects for unknown faction", () => {
		const result = queueResearch(world, "ghost", "advanced_harvesting");
		expect(result).toEqual({ ok: false, reason: "no_faction" });
	});
});

// ─── cancelResearch ───────────────────────────────────────────────────────────

describe("cancelResearch", () => {
	it("cancels active research and resets progress", () => {
		spawnFaction("player", "", "advanced_harvesting", 2);

		const cancelled = cancelResearch(world, "player");
		expect(cancelled).toBe(true);

		const state = getResearchState(world, "player");
		expect(state!.currentTechId).toBe("");
		expect(state!.progressPoints).toBe(0);
	});

	it("returns false when nothing is being researched", () => {
		spawnFaction("player");

		expect(cancelResearch(world, "player")).toBe(false);
	});

	it("returns false for unknown faction", () => {
		expect(cancelResearch(world, "ghost")).toBe(false);
	});
});

// ─── runResearch ──────────────────────────────────────────────────────────────

describe("runResearch", () => {
	it("accumulates points based on powered lab count", () => {
		spawnFaction("player", "", "advanced_harvesting", 0);
		spawnResearchLab("player", true);
		spawnResearchLab("player", true);

		runResearch(world);

		const state = getResearchState(world, "player");
		expect(state!.progressPoints).toBe(2); // 2 labs x 1 point
	});

	it("does nothing when no labs are powered", () => {
		spawnFaction("player", "", "advanced_harvesting", 0);
		spawnResearchLab("player", false); // unpowered

		runResearch(world);

		const state = getResearchState(world, "player");
		expect(state!.progressPoints).toBe(0);
	});

	it("completes research when points reach threshold", () => {
		const tech = TECH_BY_ID.get("advanced_harvesting")!;
		// Start with points one less than required
		spawnFaction("player", "", "advanced_harvesting", tech.turnsToResearch - 1);
		spawnResearchLab("player", true);

		const completed = runResearch(world);
		expect(completed).toBe(1);

		const state = getResearchState(world, "player");
		expect(state!.researchedTechs).toContain("advanced_harvesting");
		expect(state!.currentTechId).toBe("");
		expect(state!.progressPoints).toBe(0);
	});

	it("appends to existing researched techs on completion", () => {
		const tech = TECH_BY_ID.get("signal_amplification")!;
		spawnFaction(
			"player",
			"advanced_harvesting",
			"signal_amplification",
			tech.turnsToResearch - 1,
		);
		spawnResearchLab("player", true);

		runResearch(world);

		const state = getResearchState(world, "player");
		expect(state!.researchedTechs).toEqual([
			"advanced_harvesting",
			"signal_amplification",
		]);
	});

	it("does not advance when no tech is queued", () => {
		spawnFaction("player");
		spawnResearchLab("player", true);

		const completed = runResearch(world);
		expect(completed).toBe(0);
	});

	it("processes multiple factions independently", () => {
		const tech = TECH_BY_ID.get("advanced_harvesting")!;

		spawnFaction("player", "", "advanced_harvesting", tech.turnsToResearch - 1);
		spawnFaction("enemy", "", "signal_amplification", 0);
		spawnResearchLab("player", true);
		spawnResearchLab("enemy", true);

		const completed = runResearch(world);
		expect(completed).toBe(1); // only player completes

		const playerState = getResearchState(world, "player");
		expect(playerState!.researchedTechs).toContain("advanced_harvesting");

		const enemyState = getResearchState(world, "enemy");
		expect(enemyState!.progressPoints).toBe(1); // 1 lab = 1 point
		expect(enemyState!.currentTechId).toBe("signal_amplification");
	});

	it("returns 0 when no factions exist", () => {
		expect(runResearch(world)).toBe(0);
	});
});

// ─── isTechResearched ─────────────────────────────────────────────────────────

describe("isTechResearched", () => {
	it("returns true for a researched tech", () => {
		spawnFaction("player", "advanced_harvesting,signal_amplification");

		expect(isTechResearched(world, "player", "advanced_harvesting")).toBe(true);
		expect(isTechResearched(world, "player", "signal_amplification")).toBe(
			true,
		);
	});

	it("returns false for an unresearched tech", () => {
		spawnFaction("player", "advanced_harvesting");

		expect(isTechResearched(world, "player", "reinforced_chassis")).toBe(false);
	});

	it("returns false for unknown faction", () => {
		expect(isTechResearched(world, "ghost", "advanced_harvesting")).toBe(false);
	});
});

// ─── hasTechEffect ────────────────────────────────────────────────────────────

describe("hasTechEffect", () => {
	it("returns true when a researched tech has the effect", () => {
		spawnFaction("player", "advanced_harvesting");

		expect(hasTechEffect(world, "player", "harvest_bonus")).toBe(true);
	});

	it("returns false when no researched tech has the effect", () => {
		spawnFaction("player", "advanced_harvesting");

		expect(hasTechEffect(world, "player", "storm_resistance")).toBe(false);
	});

	it("returns false for empty research state", () => {
		spawnFaction("player");

		expect(hasTechEffect(world, "player", "harvest_bonus")).toBe(false);
	});
});

// ─── getTechEffectValue ───────────────────────────────────────────────────────

describe("getTechEffectValue", () => {
	it("returns effect value for a single researched tech", () => {
		spawnFaction("player", "advanced_harvesting");

		expect(getTechEffectValue(world, "player", "harvest_bonus")).toBe(0.25);
	});

	it("sums values across multiple techs with the same effect type", () => {
		// mark_ii_components has unlock_mark_level(2), mark_iii has unlock_mark_level(3)
		spawnFaction("player", "mark_ii_components,mark_iii_components");

		// unlock_mark_level: 2 + 3 = 5
		expect(getTechEffectValue(world, "player", "unlock_mark_level")).toBe(5);
	});

	it("returns 0 when no tech provides the effect", () => {
		spawnFaction("player", "advanced_harvesting");

		expect(getTechEffectValue(world, "player", "storm_resistance")).toBe(0);
	});

	it("returns 0 for unknown faction", () => {
		expect(getTechEffectValue(world, "ghost", "harvest_bonus")).toBe(0);
	});
});

// ─── Full research cycle ──────────────────────────────────────────────────────

describe("full research cycle", () => {
	it("can research a tier 1 tech, then a tier 2 tech that depends on it", () => {
		spawnFaction("player");
		spawnResearchLab("player", true);

		// Queue tier 1
		expect(queueResearch(world, "player", "advanced_harvesting")).toEqual({
			ok: true,
		});

		// Run enough turns to complete (turnsToResearch = 3, 1 lab = 1 point/turn)
		const tech1 = TECH_BY_ID.get("advanced_harvesting")!;
		for (let i = 0; i < tech1.turnsToResearch; i++) {
			runResearch(world);
		}

		expect(isTechResearched(world, "player", "advanced_harvesting")).toBe(true);

		// Now queue tier 2 that depends on it
		expect(queueResearch(world, "player", "efficient_fabrication")).toEqual({
			ok: true,
		});

		const tech2 = TECH_BY_ID.get("efficient_fabrication")!;
		for (let i = 0; i < tech2.turnsToResearch; i++) {
			runResearch(world);
		}

		expect(isTechResearched(world, "player", "efficient_fabrication")).toBe(
			true,
		);
		expect(hasTechEffect(world, "player", "fabrication_cost_reduction")).toBe(
			true,
		);
		expect(
			getTechEffectValue(world, "player", "fabrication_cost_reduction"),
		).toBe(0.2);
	});
});
