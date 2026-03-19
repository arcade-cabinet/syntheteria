/**
 * Tests for Cavalry (ARACHNOID) specialization tracks.
 *
 * Validates:
 * - Track structure (Flanker + Interceptor)
 * - Mark II-V specialization progression per track
 * - v2 upgrade replacement logic
 * - New radial menu actions per track
 * - Tech tree gate definitions
 * - Query helpers
 */

import { describe, expect, it } from "vitest";
import {
	CAVALRY_TRACKS,
	CAVALRY_TRACK_TECHS,
	FLANKER_ACTIONS,
	FLANKER_SPECIALIZATIONS,
	FLANKER_V2_UPGRADES,
	INTERCEPTOR_ACTIONS,
	INTERCEPTOR_SPECIALIZATIONS,
	INTERCEPTOR_V2_UPGRADES,
	getTrackActions,
	getTrackSpecializations,
} from "../specializations/cavalryTracks";
import type { CavalryTrack } from "../specializations/cavalryTracks";

describe("Cavalry specialization tracks", () => {
	// ─── Track Structure ──────────────────────────────────────────────

	describe("track structure", () => {
		it("has exactly 2 tracks: flanker and interceptor", () => {
			const tracks = Object.keys(CAVALRY_TRACKS) as CavalryTrack[];
			expect(tracks).toHaveLength(2);
			expect(tracks).toContain("flanker");
			expect(tracks).toContain("interceptor");
		});

		it("each track has label, description, specializations, and v2Upgrades", () => {
			for (const track of Object.values(CAVALRY_TRACKS)) {
				expect(track.label.length).toBeGreaterThan(0);
				expect(track.description.length).toBeGreaterThan(0);
				expect(track.specializations.length).toBeGreaterThanOrEqual(4);
				expect(track.v2Upgrades.length).toBeGreaterThanOrEqual(2);
			}
		});
	});

	// ─── Flanker Track ────────────────────────────────────────────────

	describe("Track A: Flanker", () => {
		it("has 4 specializations (Mark II-V)", () => {
			expect(FLANKER_SPECIALIZATIONS).toHaveLength(4);
		});

		it("Mark II: Side Arc Mastery — positional bonus from side tiles", () => {
			const spec = FLANKER_SPECIALIZATIONS[0]!;
			expect(spec.track).toBe("flanker");
			expect(spec.label).toBe("Side Arc Mastery");
			expect(spec.effectType).toBe("side_arc_bonus");
			expect(spec.effectValue).toBe(2);
		});

		it("Mark III: Terrain Ambush — charge bonus from elevation/corridors", () => {
			const spec = FLANKER_SPECIALIZATIONS[1]!;
			expect(spec.track).toBe("flanker");
			expect(spec.label).toBe("Terrain Ambush");
			expect(spec.markLevel).toBe(3);
			expect(spec.effectType).toBe("terrain_ambush");
			expect(spec.effectValue).toBe(3);
		});

		it("Mark IV: Encirclement — bonus per friendly near target", () => {
			const spec = FLANKER_SPECIALIZATIONS[2]!;
			expect(spec.track).toBe("flanker");
			expect(spec.label).toBe("Encirclement");
			expect(spec.markLevel).toBe(4);
			expect(spec.effectType).toBe("encirclement");
			expect(spec.effectValue).toBe(2);
		});

		it("Mark V: Transcendent Predator — free charge after kill, ignores defense", () => {
			const spec = FLANKER_SPECIALIZATIONS[3]!;
			expect(spec.track).toBe("flanker");
			expect(spec.label).toBe("Transcendent Predator");
			expect(spec.markLevel).toBe(5);
			expect(spec.effectType).toBe("predator_instinct");
			expect(spec.effectValue).toBe(1);
		});

		it("v2 replaces Mark III and IV", () => {
			expect(FLANKER_V2_UPGRADES).toHaveLength(2);
			expect(FLANKER_V2_UPGRADES[0]!.markLevel).toBe(3);
			expect(FLANKER_V2_UPGRADES[0]!.effectType).toBe("phantom_ambush");
			expect(FLANKER_V2_UPGRADES[1]!.markLevel).toBe(4);
			expect(FLANKER_V2_UPGRADES[1]!.effectType).toBe("coordinated_slaughter");
		});

		it("v2 Mark III (Phantom Ambush) is strictly better than Terrain Ambush", () => {
			const base = FLANKER_SPECIALIZATIONS[1]!; // terrain_ambush
			const v2 = FLANKER_V2_UPGRADES[0]!; // phantom_ambush
			expect(v2.effectValue).toBeGreaterThan(base.effectValue);
			expect(v2.markLevel).toBe(base.markLevel);
		});

		it("v2 Mark IV (Coordinated Slaughter) is strictly better than Encirclement", () => {
			const base = FLANKER_SPECIALIZATIONS[2]!; // encirclement
			const v2 = FLANKER_V2_UPGRADES[1]!; // coordinated_slaughter
			expect(v2.effectValue).toBeGreaterThan(base.effectValue);
			expect(v2.markLevel).toBe(base.markLevel);
		});
	});

	// ─── Interceptor Track ────────────────────────────────────────────

	describe("Track B: Interceptor", () => {
		it("has 4 specializations (Mark II-V)", () => {
			expect(INTERCEPTOR_SPECIALIZATIONS).toHaveLength(4);
		});

		it("Mark II: Reactive Pounce — reaction attack on nearby enemy movement", () => {
			const spec = INTERCEPTOR_SPECIALIZATIONS[0]!;
			expect(spec.track).toBe("interceptor");
			expect(spec.label).toBe("Reactive Pounce");
			expect(spec.effectType).toBe("reactive_pounce");
			expect(spec.effectValue).toBe(2);
		});

		it("Mark III: Corridor Denial — enemies pay extra MP", () => {
			const spec = INTERCEPTOR_SPECIALIZATIONS[1]!;
			expect(spec.track).toBe("interceptor");
			expect(spec.label).toBe("Corridor Denial");
			expect(spec.markLevel).toBe(3);
			expect(spec.effectType).toBe("corridor_denial");
			expect(spec.effectValue).toBe(2);
		});

		it("Mark IV: Threat Projection — extended threat zone, AP drain", () => {
			const spec = INTERCEPTOR_SPECIALIZATIONS[2]!;
			expect(spec.track).toBe("interceptor");
			expect(spec.label).toBe("Threat Projection");
			expect(spec.markLevel).toBe(4);
			expect(spec.effectType).toBe("threat_projection");
			expect(spec.effectValue).toBe(3);
		});

		it("Mark V: Transcendent Warden — unlimited pounces, no enemy retreats", () => {
			const spec = INTERCEPTOR_SPECIALIZATIONS[3]!;
			expect(spec.track).toBe("interceptor");
			expect(spec.label).toBe("Transcendent Warden");
			expect(spec.markLevel).toBe(5);
			expect(spec.effectType).toBe("warden_aura");
			expect(spec.effectValue).toBe(1);
		});

		it("v2 replaces Mark III and IV", () => {
			expect(INTERCEPTOR_V2_UPGRADES).toHaveLength(2);
			expect(INTERCEPTOR_V2_UPGRADES[0]!.markLevel).toBe(3);
			expect(INTERCEPTOR_V2_UPGRADES[0]!.effectType).toBe("gravity_well");
			expect(INTERCEPTOR_V2_UPGRADES[1]!.markLevel).toBe(4);
			expect(INTERCEPTOR_V2_UPGRADES[1]!.effectType).toBe("kill_box");
		});

		it("v2 Mark III (Gravity Well) is strictly better than Corridor Denial", () => {
			const base = INTERCEPTOR_SPECIALIZATIONS[1]!; // corridor_denial
			const v2 = INTERCEPTOR_V2_UPGRADES[0]!; // gravity_well
			expect(v2.effectValue).toBeGreaterThan(base.effectValue);
			expect(v2.markLevel).toBe(base.markLevel);
		});

		it("v2 Mark IV (Kill Box) is strictly better than Threat Projection", () => {
			const base = INTERCEPTOR_SPECIALIZATIONS[2]!; // threat_projection
			const v2 = INTERCEPTOR_V2_UPGRADES[1]!; // kill_box
			expect(v2.effectValue).toBeGreaterThan(base.effectValue);
			expect(v2.markLevel).toBe(base.markLevel);
		});
	});

	// ─── Radial Menu Actions ──────────────────────────────────────────

	describe("new radial menu actions", () => {
		it("Flanker has 2 actions: ambush_charge and surround", () => {
			expect(FLANKER_ACTIONS).toHaveLength(2);
			expect(FLANKER_ACTIONS[0]!.id).toBe("ambush_charge");
			expect(FLANKER_ACTIONS[1]!.id).toBe("surround");
		});

		it("ambush_charge is ranged combat (2-3 range), costs 1 AP", () => {
			const action = FLANKER_ACTIONS[0]!;
			expect(action.category).toBe("combat");
			expect(action.apCost).toBe(1);
			expect(action.minRange).toBe(2);
			expect(action.maxRange).toBe(3);
			expect(action.requiresEnemy).toBe(true);
			expect(action.requiresStaging).toBe(false);
		});

		it("surround is melee combat with 1-turn cooldown", () => {
			const action = FLANKER_ACTIONS[1]!;
			expect(action.category).toBe("combat");
			expect(action.apCost).toBe(1);
			expect(action.minRange).toBe(1);
			expect(action.maxRange).toBe(1);
			expect(action.requiresAdjacent).toBe(true);
			expect(action.cooldown).toBe(1);
		});

		it("Interceptor has 2 actions: pounce and lockdown", () => {
			expect(INTERCEPTOR_ACTIONS).toHaveLength(2);
			expect(INTERCEPTOR_ACTIONS[0]!.id).toBe("pounce");
			expect(INTERCEPTOR_ACTIONS[1]!.id).toBe("lockdown");
		});

		it("pounce has range 1-2, requires enemy, 1-turn cooldown", () => {
			const action = INTERCEPTOR_ACTIONS[0]!;
			expect(action.category).toBe("combat");
			expect(action.apCost).toBe(1);
			expect(action.minRange).toBe(1);
			expect(action.maxRange).toBe(2);
			expect(action.requiresEnemy).toBe(true);
			expect(action.cooldown).toBe(1);
		});

		it("lockdown is self-targeted, 2-turn cooldown", () => {
			const action = INTERCEPTOR_ACTIONS[1]!;
			expect(action.category).toBe("combat");
			expect(action.apCost).toBe(1);
			expect(action.minRange).toBe(0);
			expect(action.maxRange).toBe(0);
			expect(action.requiresEnemy).toBe(false);
			expect(action.cooldown).toBe(2);
		});

		it("all actions have non-empty labels, icons, and descriptions", () => {
			for (const action of [...FLANKER_ACTIONS, ...INTERCEPTOR_ACTIONS]) {
				expect(action.label.length).toBeGreaterThan(0);
				expect(action.icon.length).toBeGreaterThan(0);
				expect(action.description.length).toBeGreaterThan(0);
			}
		});

		it("no duplicate action IDs across both tracks", () => {
			const allIds = [...FLANKER_ACTIONS, ...INTERCEPTOR_ACTIONS].map(a => a.id);
			expect(new Set(allIds).size).toBe(allIds.length);
		});
	});

	// ─── Tech Tree Gates ──────────────────────────────────────────────

	describe("tech tree gates", () => {
		it("has 2 techs: tier 2 unlock + tier 4 v2 upgrade", () => {
			expect(CAVALRY_TRACK_TECHS).toHaveLength(2);
		});

		it("tier 2: Arachnoid Motor Suite — unlocks both tracks", () => {
			const tech = CAVALRY_TRACK_TECHS[0]!;
			expect(tech.id).toBe("arachnoid_motor_suite");
			expect(tech.tier).toBe(2);
			expect(tech.prerequisites).toContain("reinforced_chassis");
			expect(tech.turnsToResearch).toBeGreaterThan(0);
			expect(Object.keys(tech.cost).length).toBeGreaterThan(0);
		});

		it("tier 4: Predator Reflex Core — upgrades to v2", () => {
			const tech = CAVALRY_TRACK_TECHS[1]!;
			expect(tech.id).toBe("predator_reflex_core");
			expect(tech.tier).toBe(4);
			expect(tech.prerequisites).toContain("arachnoid_motor_suite");
			expect(tech.prerequisites).toContain("mark_iii_components");
			expect(tech.turnsToResearch).toBeGreaterThan(0);
		});

		it("v2 tech requires the unlock tech as prerequisite", () => {
			const unlockId = CAVALRY_TRACK_TECHS[0]!.id;
			const v2 = CAVALRY_TRACK_TECHS[1]!;
			expect(v2.prerequisites).toContain(unlockId);
		});

		it("all techs have valid effects", () => {
			for (const tech of CAVALRY_TRACK_TECHS) {
				expect(tech.effects.length).toBeGreaterThan(0);
				for (const eff of tech.effects) {
					expect(eff.type).toBeTruthy();
					expect(eff.value).toBeGreaterThan(0);
				}
			}
		});
	});

	// ─── Query Helpers ────────────────────────────────────────────────

	describe("getTrackSpecializations", () => {
		it("returns empty for mark level 1 (no specs yet)", () => {
			expect(getTrackSpecializations("flanker", 1)).toHaveLength(0);
			expect(getTrackSpecializations("interceptor", 1)).toHaveLength(0);
		});

		it("returns Mark II spec at level 2", () => {
			const flankerSpecs = getTrackSpecializations("flanker", 2);
			expect(flankerSpecs).toHaveLength(1);
			expect(flankerSpecs[0]!.effectType).toBe("side_arc_bonus");

			const interceptorSpecs = getTrackSpecializations("interceptor", 2);
			expect(interceptorSpecs).toHaveLength(1);
			expect(interceptorSpecs[0]!.effectType).toBe("reactive_pounce");
		});

		it("returns Mark II+III at level 3", () => {
			const specs = getTrackSpecializations("flanker", 3);
			expect(specs).toHaveLength(2);
			expect(specs[0]!.effectType).toBe("side_arc_bonus");
			expect(specs[1]!.effectType).toBe("terrain_ambush");
		});

		it("returns Mark II+III+IV at level 4", () => {
			const specs = getTrackSpecializations("interceptor", 4);
			expect(specs).toHaveLength(3);
			expect(specs[2]!.effectType).toBe("threat_projection");
		});

		it("returns all 4 specs at Mark V", () => {
			const flanker = getTrackSpecializations("flanker", 5);
			expect(flanker).toHaveLength(4);
			expect(flanker[3]!.effectType).toBe("predator_instinct");

			const interceptor = getTrackSpecializations("interceptor", 5);
			expect(interceptor).toHaveLength(4);
			expect(interceptor[3]!.effectType).toBe("warden_aura");
		});

		it("v2 mode replaces Mark III/IV base specs", () => {
			const specs = getTrackSpecializations("flanker", 5, true);
			expect(specs).toHaveLength(4);

			const effectTypes = specs.map(s => s.effectType);
			// Mark II stays (side_arc_bonus)
			expect(effectTypes).toContain("side_arc_bonus");
			// Mark III replaced by phantom_ambush
			expect(effectTypes).toContain("phantom_ambush");
			expect(effectTypes).not.toContain("terrain_ambush");
			// Mark IV replaced by coordinated_slaughter
			expect(effectTypes).toContain("coordinated_slaughter");
			expect(effectTypes).not.toContain("encirclement");
			// Mark V stays (predator_instinct)
			expect(effectTypes).toContain("predator_instinct");
		});

		it("v2 mode for interceptor replaces correctly", () => {
			const specs = getTrackSpecializations("interceptor", 5, true);
			const effectTypes = specs.map(s => s.effectType);
			expect(effectTypes).toContain("reactive_pounce");
			expect(effectTypes).toContain("gravity_well");
			expect(effectTypes).not.toContain("corridor_denial");
			expect(effectTypes).toContain("kill_box");
			expect(effectTypes).not.toContain("threat_projection");
			expect(effectTypes).toContain("warden_aura");
		});

		it("v2 mode at Mark III only returns Mark II + v2 Mark III", () => {
			const specs = getTrackSpecializations("flanker", 3, true);
			expect(specs).toHaveLength(2);
			expect(specs[0]!.effectType).toBe("side_arc_bonus");
			expect(specs[1]!.effectType).toBe("phantom_ambush");
		});
	});

	describe("getTrackActions", () => {
		it("flanker returns FLANKER_ACTIONS", () => {
			const actions = getTrackActions("flanker");
			expect(actions).toBe(FLANKER_ACTIONS);
			expect(actions).toHaveLength(2);
		});

		it("interceptor returns INTERCEPTOR_ACTIONS", () => {
			const actions = getTrackActions("interceptor");
			expect(actions).toBe(INTERCEPTOR_ACTIONS);
			expect(actions).toHaveLength(2);
		});
	});

	// ─── All specializations have track field ─────────────────────────

	describe("data integrity", () => {
		it("all flanker specializations have track=flanker", () => {
			for (const spec of [...FLANKER_SPECIALIZATIONS, ...FLANKER_V2_UPGRADES]) {
				expect(spec.track).toBe("flanker");
			}
		});

		it("all interceptor specializations have track=interceptor", () => {
			for (const spec of [...INTERCEPTOR_SPECIALIZATIONS, ...INTERCEPTOR_V2_UPGRADES]) {
				expect(spec.track).toBe("interceptor");
			}
		});

		it("all specializations have non-empty labels and descriptions", () => {
			const all = [
				...FLANKER_SPECIALIZATIONS,
				...FLANKER_V2_UPGRADES,
				...INTERCEPTOR_SPECIALIZATIONS,
				...INTERCEPTOR_V2_UPGRADES,
			];
			for (const spec of all) {
				expect(spec.label.length).toBeGreaterThan(0);
				expect(spec.description.length).toBeGreaterThan(0);
				expect(spec.effectType.length).toBeGreaterThan(0);
				expect(spec.effectValue).toBeGreaterThan(0);
			}
		});

		it("no duplicate effectTypes within a track (base specs only)", () => {
			const flankerTypes = FLANKER_SPECIALIZATIONS.map(s => s.effectType);
			expect(new Set(flankerTypes).size).toBe(flankerTypes.length);

			const interceptorTypes = INTERCEPTOR_SPECIALIZATIONS.map(s => s.effectType);
			expect(new Set(interceptorTypes).size).toBe(interceptorTypes.length);
		});

		it("v2 upgrades have unique effectTypes (not reusing base types)", () => {
			const baseTypes = new Set([
				...FLANKER_SPECIALIZATIONS.map(s => s.effectType),
				...INTERCEPTOR_SPECIALIZATIONS.map(s => s.effectType),
			]);
			for (const v2 of [...FLANKER_V2_UPGRADES, ...INTERCEPTOR_V2_UPGRADES]) {
				expect(baseTypes.has(v2.effectType)).toBe(false);
			}
		});

		it("tech IDs are unique", () => {
			const ids = CAVALRY_TRACK_TECHS.map(t => t.id);
			expect(new Set(ids).size).toBe(ids.length);
		});
	});
});
