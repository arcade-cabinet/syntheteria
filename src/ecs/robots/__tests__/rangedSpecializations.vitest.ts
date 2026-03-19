import { describe, expect, it } from "vitest";
import {
	RANGED_TRACKS,
	RANGED_SPEC_TECHS,
	getRangedTrack,
	getRangedTrackActions,
	getRangedTrackSpecs,
	hasRangedTrackEffect,
	getRangedTrackEffectValue,
	applyTrackStatMods,
} from "../specializations/rangedTracks";
import type { RangedTrack } from "../specializations/rangedTracks";
import { RANGED_DEFAULTS } from "../GuardBot";
import { TECH_BY_ID } from "../../../config/techTreeDefs";

// ─── Track Structure ─────────────────────────────────────────────────────────

describe("rangedTracks — structure", () => {
	const TRACKS: RangedTrack[] = ["sniper", "suppressor"];

	it("defines exactly 2 tracks", () => {
		expect(Object.keys(RANGED_TRACKS)).toHaveLength(2);
	});

	it("every track has id, label, description, statMods, actions, markSpecializations, requiredTech, v2", () => {
		for (const id of TRACKS) {
			const t = RANGED_TRACKS[id];
			expect(t.id).toBe(id);
			expect(t.label.length).toBeGreaterThan(0);
			expect(t.description.length).toBeGreaterThan(0);
			expect(t.statMods).toBeDefined();
			expect(t.actions.length).toBeGreaterThanOrEqual(1);
			expect(t.markSpecializations.length).toBe(3); // Mark III, IV, V
			expect(t.requiredTech.length).toBeGreaterThanOrEqual(1);
			expect(t.v2).toBeDefined();
			expect(t.v2.label.length).toBeGreaterThan(0);
			expect(t.v2.requiredTech.length).toBeGreaterThanOrEqual(1);
			expect(t.v2.description.length).toBeGreaterThan(0);
		}
	});

	it("mark specializations cover levels 3, 4, 5", () => {
		for (const id of TRACKS) {
			const specs = RANGED_TRACKS[id].markSpecializations;
			expect(specs[0]!.markLevel).toBe(3);
			expect(specs[1]!.markLevel).toBe(4);
			expect(specs[2]!.markLevel).toBe(5);
		}
	});

	it("all actions have unique IDs within each track", () => {
		for (const id of TRACKS) {
			const actions = RANGED_TRACKS[id].actions;
			const ids = actions.map(a => a.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	it("no action ID collides between tracks", () => {
		const allIds = Object.values(RANGED_TRACKS).flatMap(t => t.actions.map(a => a.id));
		expect(new Set(allIds).size).toBe(allIds.length);
	});

	it("all actions have non-empty labels and descriptions", () => {
		for (const id of TRACKS) {
			for (const a of RANGED_TRACKS[id].actions) {
				expect(a.label.length).toBeGreaterThan(0);
				expect(a.description.length).toBeGreaterThan(0);
			}
		}
	});

	it("all track actions require staging (consistent with base ranged)", () => {
		for (const id of TRACKS) {
			for (const a of RANGED_TRACKS[id].actions) {
				expect(a.requiresStaging).toBe(true);
			}
		}
	});
});

// ─── Track A: Sniper ─────────────────────────────────────────────────────────

describe("rangedTracks — Sniper", () => {
	const sniper = RANGED_TRACKS.sniper;

	it("has 2 unique actions: aimed_shot and headshot", () => {
		expect(sniper.actions).toHaveLength(2);
		expect(sniper.actions[0]!.id).toBe("aimed_shot");
		expect(sniper.actions[1]!.id).toBe("headshot");
	});

	it("aimed_shot has extreme range 3-6 and costs 2 AP", () => {
		const aimed = sniper.actions[0]!;
		expect(aimed.minRange).toBe(3);
		expect(aimed.maxRange).toBe(6);
		expect(aimed.apCost).toBe(2);
		expect(aimed.requiresEnemy).toBe(true);
	});

	it("headshot has 2-turn cooldown and costs 2 AP", () => {
		const hs = sniper.actions[1]!;
		expect(hs.cooldown).toBe(2);
		expect(hs.apCost).toBe(2);
		expect(hs.requiresEnemy).toBe(true);
	});

	it("stat mods: +2 attackRange, +1 attack, -1 defense (glass cannon)", () => {
		expect(sniper.statMods.attackRange).toBe(2);
		expect(sniper.statMods.attack).toBe(1);
		expect(sniper.statMods.defense).toBe(-1);
	});

	it("mark III: precision optics (+1 range)", () => {
		const spec = sniper.markSpecializations[0]!;
		expect(spec.markLevel).toBe(3);
		expect(spec.effectType).toBe("sniper_range_bonus");
		expect(spec.effectValue).toBe(1);
	});

	it("mark IV: armor-piercing rounds (ignore 2 defense)", () => {
		const spec = sniper.markSpecializations[1]!;
		expect(spec.markLevel).toBe(4);
		expect(spec.effectType).toBe("sniper_armor_pierce");
		expect(spec.effectValue).toBe(2);
	});

	it("mark V: transcendent marksman (guaranteed first crit)", () => {
		const spec = sniper.markSpecializations[2]!;
		expect(spec.markLevel).toBe(5);
		expect(spec.effectType).toBe("sniper_guaranteed_crit");
		expect(spec.effectValue).toBe(1);
	});

	it("v2 upgrade grants +3 range, +2 attack, +2 scan", () => {
		expect(sniper.v2.statMods.attackRange).toBe(3);
		expect(sniper.v2.statMods.attack).toBe(2);
		expect(sniper.v2.statMods.scanRange).toBe(2);
	});

	it("v2 requires mark_iv_components + quantum_processors", () => {
		expect(sniper.v2.requiredTech).toContain("mark_iv_components");
		expect(sniper.v2.requiredTech).toContain("quantum_processors");
	});
});

// ─── Track B: Suppressor ─────────────────────────────────────────────────────

describe("rangedTracks — Suppressor", () => {
	const sup = RANGED_TRACKS.suppressor;

	it("has 2 unique actions: suppressive_fire and barrage", () => {
		expect(sup.actions).toHaveLength(2);
		expect(sup.actions[0]!.id).toBe("suppressive_fire");
		expect(sup.actions[1]!.id).toBe("barrage");
	});

	it("suppressive_fire costs 1 AP and targets enemies at range 2-3", () => {
		const sf = sup.actions[0]!;
		expect(sf.apCost).toBe(1);
		expect(sf.minRange).toBe(2);
		expect(sf.maxRange).toBe(3);
		expect(sf.requiresEnemy).toBe(true);
	});

	it("barrage costs 2 AP, has 2-turn cooldown, does NOT require enemy (hits tile)", () => {
		const b = sup.actions[1]!;
		expect(b.apCost).toBe(2);
		expect(b.cooldown).toBe(2);
		expect(b.requiresEnemy).toBe(false);
	});

	it("stat mods: +2 HP, +2 maxHP, -1 attack (area compensates)", () => {
		expect(sup.statMods.hp).toBe(2);
		expect(sup.statMods.maxHp).toBe(2);
		expect(sup.statMods.attack).toBe(-1);
	});

	it("mark III: concussive rounds (AP drain)", () => {
		const spec = sup.markSpecializations[0]!;
		expect(spec.markLevel).toBe(3);
		expect(spec.effectType).toBe("suppressor_ap_drain");
		expect(spec.effectValue).toBe(1);
	});

	it("mark IV: denial zone (MP reduction in 2-tile radius)", () => {
		const spec = sup.markSpecializations[1]!;
		expect(spec.markLevel).toBe(4);
		expect(spec.effectType).toBe("suppressor_zone_penalty");
		expect(spec.effectValue).toBe(2);
	});

	it("mark V: transcendent bombardier (free barrage)", () => {
		const spec = sup.markSpecializations[2]!;
		expect(spec.markLevel).toBe(5);
		expect(spec.effectType).toBe("suppressor_barrage_free");
		expect(spec.effectValue).toBe(1);
	});

	it("v2 upgrade grants +4 HP, +4 maxHP, +1 defense", () => {
		expect(sup.v2.statMods.hp).toBe(4);
		expect(sup.v2.statMods.maxHp).toBe(4);
		expect(sup.v2.statMods.defense).toBe(1);
	});

	it("v2 requires mark_iv_components + adaptive_armor", () => {
		expect(sup.v2.requiredTech).toContain("mark_iv_components");
		expect(sup.v2.requiredTech).toContain("adaptive_armor");
	});
});

// ─── Tech Tree Extensions ────────────────────────────────────────────────────

describe("rangedTracks — tech tree", () => {
	it("defines 2 new techs", () => {
		expect(RANGED_SPEC_TECHS).toHaveLength(2);
	});

	it("precision_targeting is tier 2 and requires mark_ii_components + signal_amplification", () => {
		const tech = RANGED_SPEC_TECHS.find(t => t.id === "precision_targeting")!;
		expect(tech.tier).toBe(2);
		expect(tech.prerequisites).toContain("mark_ii_components");
		expect(tech.prerequisites).toContain("signal_amplification");
	});

	it("area_suppression is tier 2 and requires mark_ii_components + reinforced_chassis", () => {
		const tech = RANGED_SPEC_TECHS.find(t => t.id === "area_suppression")!;
		expect(tech.tier).toBe(2);
		expect(tech.prerequisites).toContain("mark_ii_components");
		expect(tech.prerequisites).toContain("reinforced_chassis");
	});

	it("prerequisite techs all exist in the main tech tree", () => {
		for (const tech of RANGED_SPEC_TECHS) {
			for (const prereq of tech.prerequisites) {
				expect(TECH_BY_ID.has(prereq)).toBe(true);
			}
		}
	});

	it("v2 requiredTech references exist in the main tech tree", () => {
		for (const track of Object.values(RANGED_TRACKS)) {
			for (const techId of track.v2.requiredTech) {
				expect(TECH_BY_ID.has(techId)).toBe(true);
			}
		}
	});
});

// ─── Lookup Helpers ──────────────────────────────────────────────────────────

describe("rangedTracks — helpers", () => {
	it("getRangedTrack returns correct track", () => {
		expect(getRangedTrack("sniper").label).toBe("Sniper");
		expect(getRangedTrack("suppressor").label).toBe("Suppressor");
	});

	it("getRangedTrackActions returns only track-specific actions", () => {
		const sniperActions = getRangedTrackActions("sniper");
		expect(sniperActions).toHaveLength(2);
		expect(sniperActions[0]!.id).toBe("aimed_shot");

		const supActions = getRangedTrackActions("suppressor");
		expect(supActions).toHaveLength(2);
		expect(supActions[0]!.id).toBe("suppressive_fire");
	});

	it("getRangedTrackSpecs returns empty below mark III", () => {
		expect(getRangedTrackSpecs("sniper", 1)).toEqual([]);
		expect(getRangedTrackSpecs("sniper", 2)).toEqual([]);
		expect(getRangedTrackSpecs("suppressor", 1)).toEqual([]);
	});

	it("getRangedTrackSpecs returns 1 spec at mark III", () => {
		const specs = getRangedTrackSpecs("sniper", 3);
		expect(specs).toHaveLength(1);
		expect(specs[0]!.effectType).toBe("sniper_range_bonus");
	});

	it("getRangedTrackSpecs returns 2 specs at mark IV", () => {
		const specs = getRangedTrackSpecs("suppressor", 4);
		expect(specs).toHaveLength(2);
		expect(specs[0]!.effectType).toBe("suppressor_ap_drain");
		expect(specs[1]!.effectType).toBe("suppressor_zone_penalty");
	});

	it("getRangedTrackSpecs returns all 3 at mark V", () => {
		expect(getRangedTrackSpecs("sniper", 5)).toHaveLength(3);
		expect(getRangedTrackSpecs("suppressor", 5)).toHaveLength(3);
	});

	it("hasRangedTrackEffect detects active effects", () => {
		expect(hasRangedTrackEffect("sniper", 3, "sniper_range_bonus")).toBe(true);
		expect(hasRangedTrackEffect("sniper", 2, "sniper_range_bonus")).toBe(false);
		expect(hasRangedTrackEffect("sniper", 3, "nonexistent")).toBe(false);
	});

	it("getRangedTrackEffectValue returns correct values", () => {
		expect(getRangedTrackEffectValue("sniper", 3, "sniper_range_bonus")).toBe(1);
		expect(getRangedTrackEffectValue("sniper", 4, "sniper_armor_pierce")).toBe(2);
		expect(getRangedTrackEffectValue("suppressor", 5, "suppressor_barrage_free")).toBe(1);
	});

	it("getRangedTrackEffectValue returns 0 for no match", () => {
		expect(getRangedTrackEffectValue("sniper", 2, "sniper_range_bonus")).toBe(0);
		expect(getRangedTrackEffectValue("suppressor", 3, "nonexistent")).toBe(0);
	});
});

// ─── Stat Application ────────────────────────────────────────────────────────

describe("rangedTracks — applyTrackStatMods", () => {
	const BASE = {
		hp: RANGED_DEFAULTS.stats.hp,
		maxHp: RANGED_DEFAULTS.stats.maxHp,
		ap: RANGED_DEFAULTS.stats.ap,
		maxAp: RANGED_DEFAULTS.stats.maxAp,
		mp: RANGED_DEFAULTS.stats.mp,
		maxMp: RANGED_DEFAULTS.stats.maxMp,
		scanRange: RANGED_DEFAULTS.stats.scanRange,
		attack: RANGED_DEFAULTS.stats.attack,
		defense: RANGED_DEFAULTS.stats.defense,
		attackRange: RANGED_DEFAULTS.stats.attackRange,
	};

	it("sniper: base 3 attackRange → 5, base 4 attack → 5, base 2 defense → 1", () => {
		const result = applyTrackStatMods(BASE, "sniper", false);
		expect(result.attackRange).toBe(5);
		expect(result.attack).toBe(5);
		expect(result.defense).toBe(1);
		// Unchanged stats
		expect(result.hp).toBe(12);
		expect(result.ap).toBe(2);
	});

	it("suppressor: base 12 HP → 14, base 4 attack → 3", () => {
		const result = applyTrackStatMods(BASE, "suppressor", false);
		expect(result.hp).toBe(14);
		expect(result.maxHp).toBe(14);
		expect(result.attack).toBe(3);
		// Unchanged
		expect(result.defense).toBe(2);
		expect(result.attackRange).toBe(3);
	});

	it("sniper v2: base 3 attackRange → 6, base 4 attack → 6, base 6 scanRange → 8", () => {
		const result = applyTrackStatMods(BASE, "sniper", true);
		expect(result.attackRange).toBe(6);
		expect(result.attack).toBe(6);
		expect(result.scanRange).toBe(8);
	});

	it("suppressor v2: base 12 HP → 16, base 2 defense → 3", () => {
		const result = applyTrackStatMods(BASE, "suppressor", true);
		expect(result.hp).toBe(16);
		expect(result.maxHp).toBe(16);
		expect(result.defense).toBe(3);
	});

	it("does not mutate original stats", () => {
		const original = { ...BASE };
		applyTrackStatMods(BASE, "sniper", false);
		expect(BASE).toEqual(original);
	});
});

// ─── Design Consistency ──────────────────────────────────────────────────────

describe("rangedTracks — design consistency", () => {
	it("both tracks require mark_ii_components (tier 2 unlock)", () => {
		expect(RANGED_TRACKS.sniper.requiredTech).toContain("mark_ii_components");
		expect(RANGED_TRACKS.suppressor.requiredTech).toContain("mark_ii_components");
	});

	it("sniper is glass cannon — defense decreases", () => {
		expect(RANGED_TRACKS.sniper.statMods.defense).toBeLessThan(0);
		expect(RANGED_TRACKS.sniper.statMods.attack).toBeGreaterThan(0);
		expect(RANGED_TRACKS.sniper.statMods.attackRange).toBeGreaterThan(0);
	});

	it("suppressor is tanky area denial — HP increases, attack decreases", () => {
		expect(RANGED_TRACKS.suppressor.statMods.hp).toBeGreaterThan(0);
		expect(RANGED_TRACKS.suppressor.statMods.attack).toBeLessThan(0);
	});

	it("sniper actions have longer range than suppressor actions", () => {
		const sniperMaxRange = Math.max(...RANGED_TRACKS.sniper.actions.map(a => a.maxRange));
		const supMaxRange = Math.max(...RANGED_TRACKS.suppressor.actions.map(a => a.maxRange));
		expect(sniperMaxRange).toBeGreaterThan(supMaxRange);
	});

	it("specialization is permanent — tracks have distinct effect type prefixes", () => {
		const sniperEffects = RANGED_TRACKS.sniper.markSpecializations.map(s => s.effectType);
		const supEffects = RANGED_TRACKS.suppressor.markSpecializations.map(s => s.effectType);
		for (const e of sniperEffects) {
			expect(e.startsWith("sniper_")).toBe(true);
		}
		for (const e of supEffects) {
			expect(e.startsWith("suppressor_")).toBe(true);
		}
	});
});
