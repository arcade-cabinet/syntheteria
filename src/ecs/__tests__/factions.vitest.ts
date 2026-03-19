import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { CULT_DEFINITIONS } from "../factions/cults";
import { FACTION_DEFINITIONS } from "../factions/definitions";
import { initFactions } from "../factions/init";
import { getRelation, isHostile, setRelation } from "../factions/relations";
import { Faction } from "../traits/faction";

describe("FACTION_DEFINITIONS", () => {
	it("has 4 entries (no hardcoded player faction)", () => {
		expect(FACTION_DEFINITIONS).toHaveLength(4);
	});

	it("has no built-in player faction — player is selected at New Game", () => {
		const playerFactions = FACTION_DEFINITIONS.filter((f) => f.isPlayer);
		expect(playerFactions).toHaveLength(0);
	});

	it("has unique ids", () => {
		const ids = FACTION_DEFINITIONS.map((f) => f.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("CULT_DEFINITIONS", () => {
	it("has 3 entries", () => {
		expect(CULT_DEFINITIONS).toHaveLength(3);
	});

	it("cults are independent of machine factions — no parentFactionId", () => {
		// Cults are EL-worshipping human survivors, not sub-factions of any machine AI.
		// They have a sector (where they haunt), not a parent faction.
		for (const cult of CULT_DEFINITIONS) {
			expect(cult).not.toHaveProperty("parentFactionId");
			expect(cult.sector).toBeDefined();
		}
	});

	it("all have unique ids", () => {
		const ids = CULT_DEFINITIONS.map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("null_monks are the most aggressive sect (aggressionLevel 3)", () => {
		const nullMonks = CULT_DEFINITIONS.find((c) => c.id === "null_monks");
		expect(nullMonks?.aggressionLevel).toBe(3);
	});

	it("static_remnants are low-aggression (aggressionLevel 1)", () => {
		const remnants = CULT_DEFINITIONS.find((c) => c.id === "static_remnants");
		expect(remnants?.aggressionLevel).toBe(1);
	});
});

describe("initFactions", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("spawns faction entities (4 AI when no player selected)", () => {
		initFactions(world);
		const factions = world.query(Faction);
		expect(factions.length).toBe(4);
	});

	it("spawns player faction from slot config", () => {
		initFactions(world, "standard", [
			{ factionId: "reclaimers", role: "player" },
			{ factionId: "volt_collective", role: "ai" },
			{ factionId: "signal_choir", role: "ai" },
			{ factionId: "iron_creed", role: "off" },
		]);
		const factions = world.query(Faction);
		// 3 spawned: player (reclaimers), volt_collective, signal_choir. iron_creed is off.
		expect(factions.length).toBe(3);
		let foundPlayer = false;
		for (const e of factions) {
			const f = e.get(Faction)!;
			if (f.id === "player") {
				expect(f.isPlayer).toBe(true);
				expect(f.displayName).toBe("Reclaimers");
				foundPlayer = true;
			}
		}
		expect(foundPlayer).toBe(true);
	});
});

describe("faction relations", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("defaults to neutral", () => {
		expect(getRelation(world, "player", "reclaimers")).toBe("neutral");
	});

	it("sets and gets relation", () => {
		setRelation(world, "player", "reclaimers", "hostile");
		expect(getRelation(world, "player", "reclaimers")).toBe("hostile");
	});

	it("relation is bidirectional", () => {
		setRelation(world, "player", "reclaimers", "ally");
		expect(getRelation(world, "reclaimers", "player")).toBe("ally");
	});

	it("updates existing relation", () => {
		setRelation(world, "player", "reclaimers", "hostile");
		setRelation(world, "player", "reclaimers", "ally");
		expect(getRelation(world, "player", "reclaimers")).toBe("ally");
	});

	it("isHostile returns true for hostile", () => {
		setRelation(world, "player", "signal_choir", "hostile");
		expect(isHostile(world, "player", "signal_choir")).toBe(true);
	});

	it("isHostile returns false for non-hostile", () => {
		expect(isHostile(world, "player", "reclaimers")).toBe(false);
	});
});
