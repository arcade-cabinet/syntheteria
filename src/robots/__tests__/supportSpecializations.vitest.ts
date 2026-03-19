/**
 * Tests for Support (COMPANION) specialization tracks.
 *
 * Three tracks: Field Medic, Signal Booster, War Caller.
 * Verifies track definitions, mark progression, v2 upgrades,
 * actions, tech tree techs, and query helpers.
 */

import { describe, expect, it } from "vitest";
import type { SupportTrack } from "../specializations/supportTracks";
import {
	FIELD_MEDIC_ACTIONS,
	FIELD_MEDIC_SPECIALIZATIONS,
	FIELD_MEDIC_V2_UPGRADES,
	getTrackActions,
	getTrackSpecializations,
	SIGNAL_BOOSTER_ACTIONS,
	SIGNAL_BOOSTER_SPECIALIZATIONS,
	SIGNAL_BOOSTER_V2_UPGRADES,
	SUPPORT_TRACK_TECHS,
	SUPPORT_TRACKS,
	WAR_CALLER_ACTIONS,
	WAR_CALLER_SPECIALIZATIONS,
	WAR_CALLER_V2_UPGRADES,
} from "../specializations/supportTracks";

describe("Support specialization tracks", () => {
	// ─── Track structure ──────────────────────────────────────────────

	describe("track definitions", () => {
		it("has exactly 3 tracks", () => {
			expect(Object.keys(SUPPORT_TRACKS)).toHaveLength(3);
		});

		it("tracks are field_medic, signal_booster, war_caller", () => {
			expect(SUPPORT_TRACKS.field_medic).toBeDefined();
			expect(SUPPORT_TRACKS.signal_booster).toBeDefined();
			expect(SUPPORT_TRACKS.war_caller).toBeDefined();
		});

		it("each track has label, description, specializations, and v2Upgrades", () => {
			for (const key of Object.keys(SUPPORT_TRACKS) as SupportTrack[]) {
				const track = SUPPORT_TRACKS[key];
				expect(track.label).toBeTruthy();
				expect(track.description).toBeTruthy();
				expect(track.specializations.length).toBeGreaterThanOrEqual(4);
				expect(track.v2Upgrades.length).toBeGreaterThanOrEqual(2);
			}
		});
	});

	// ─── Track A: Field Medic ─────────────────────────────────────────

	describe("Track A: Field Medic", () => {
		it("has 4 specializations (Mark II-V)", () => {
			expect(FIELD_MEDIC_SPECIALIZATIONS).toHaveLength(4);
		});

		it("Mark II: Triage Protocols — improved repair", () => {
			const spec = FIELD_MEDIC_SPECIALIZATIONS[0]!;
			expect(spec.track).toBe("field_medic");
			expect(spec.effectType).toBe("triage_protocols");
			expect(spec.effectValue).toBe(3);
			expect(spec.description).toContain("3 HP");
		});

		it("Mark III: Regeneration Aura — passive healing", () => {
			const spec = FIELD_MEDIC_SPECIALIZATIONS[1]!;
			expect(spec.markLevel).toBe(3);
			expect(spec.effectType).toBe("regen_aura");
			expect(spec.effectValue).toBe(1);
		});

		it("Mark IV: Emergency Stabilizer — death prevention", () => {
			const spec = FIELD_MEDIC_SPECIALIZATIONS[2]!;
			expect(spec.markLevel).toBe(4);
			expect(spec.effectType).toBe("emergency_stabilize");
			expect(spec.description).toContain("1 HP");
		});

		it("Mark V: Transcendent Restorer — chassis revival", () => {
			const spec = FIELD_MEDIC_SPECIALIZATIONS[3]!;
			expect(spec.markLevel).toBe(5);
			expect(spec.effectType).toBe("chassis_revival");
			expect(spec.description).toContain("destroyed");
		});

		it("v2 upgrades replace Mark III and IV", () => {
			expect(FIELD_MEDIC_V2_UPGRADES).toHaveLength(2);
			expect(FIELD_MEDIC_V2_UPGRADES[0]!.markLevel).toBe(3);
			expect(FIELD_MEDIC_V2_UPGRADES[0]!.effectType).toBe("nanite_regen");
			expect(FIELD_MEDIC_V2_UPGRADES[1]!.markLevel).toBe(4);
			expect(FIELD_MEDIC_V2_UPGRADES[1]!.effectType).toBe("failsafe_override");
		});

		it("v2 Mark III (Nanite Swarm) is strictly better than base (Regen Aura)", () => {
			const base = FIELD_MEDIC_SPECIALIZATIONS[1]!;
			const v2 = FIELD_MEDIC_V2_UPGRADES[0]!;
			expect(v2.effectValue).toBeGreaterThan(base.effectValue);
		});
	});

	// ─── Track B: Signal Booster ──────────────────────────────────────

	describe("Track B: Signal Booster", () => {
		it("has 4 specializations (Mark II-V)", () => {
			expect(SIGNAL_BOOSTER_SPECIALIZATIONS).toHaveLength(4);
		});

		it("Mark II: Relay Amplifier — scan extension", () => {
			const spec = SIGNAL_BOOSTER_SPECIALIZATIONS[0]!;
			expect(spec.track).toBe("signal_booster");
			expect(spec.effectType).toBe("relay_amplifier");
			expect(spec.effectValue).toBe(3);
		});

		it("Mark III: Counter-Stealth Array — stealth detection", () => {
			const spec = SIGNAL_BOOSTER_SPECIALIZATIONS[1]!;
			expect(spec.markLevel).toBe(3);
			expect(spec.effectType).toBe("counter_stealth");
			expect(spec.effectValue).toBe(4);
		});

		it("Mark IV: Signal Jammer — enemy scan reduction", () => {
			const spec = SIGNAL_BOOSTER_SPECIALIZATIONS[2]!;
			expect(spec.markLevel).toBe(4);
			expect(spec.effectType).toBe("signal_jam");
		});

		it("Mark V: Transcendent Overseer — faction-wide shared vision", () => {
			const spec = SIGNAL_BOOSTER_SPECIALIZATIONS[3]!;
			expect(spec.markLevel).toBe(5);
			expect(spec.effectType).toBe("omniscient_relay");
			expect(spec.description).toContain("share vision");
		});

		it("v2 upgrades replace Mark III and IV", () => {
			expect(SIGNAL_BOOSTER_V2_UPGRADES).toHaveLength(2);
			expect(SIGNAL_BOOSTER_V2_UPGRADES[0]!.markLevel).toBe(3);
			expect(SIGNAL_BOOSTER_V2_UPGRADES[0]!.effectType).toBe(
				"quantum_counter_stealth",
			);
			expect(SIGNAL_BOOSTER_V2_UPGRADES[1]!.markLevel).toBe(4);
			expect(SIGNAL_BOOSTER_V2_UPGRADES[1]!.effectType).toBe("blackout_pulse");
		});

		it("v2 Mark III (Quantum Resonance) has greater range than base (Counter-Stealth)", () => {
			const base = SIGNAL_BOOSTER_SPECIALIZATIONS[1]!;
			const v2 = SIGNAL_BOOSTER_V2_UPGRADES[0]!;
			expect(v2.effectValue).toBeGreaterThan(base.effectValue);
		});
	});

	// ─── Track C: War Caller ──────────────────────────────────────────

	describe("Track C: War Caller", () => {
		it("has 4 specializations (Mark II-V)", () => {
			expect(WAR_CALLER_SPECIALIZATIONS).toHaveLength(4);
		});

		it("Mark II: Tactical Directive — attack buff aura", () => {
			const spec = WAR_CALLER_SPECIALIZATIONS[0]!;
			expect(spec.track).toBe("war_caller");
			expect(spec.effectType).toBe("tactical_directive");
			expect(spec.effectValue).toBe(1);
		});

		it("Mark III: Disruption Wave — enemy AP debuff", () => {
			const spec = WAR_CALLER_SPECIALIZATIONS[1]!;
			expect(spec.markLevel).toBe(3);
			expect(spec.effectType).toBe("disruption_wave");
			expect(spec.description).toContain("AP");
		});

		it("Mark IV: Coordination Matrix — AoE attack + defense buff", () => {
			const spec = WAR_CALLER_SPECIALIZATIONS[2]!;
			expect(spec.markLevel).toBe(4);
			expect(spec.effectType).toBe("coordination_matrix");
			expect(spec.description).toContain("attack");
			expect(spec.description).toContain("defense");
		});

		it("Mark V: Transcendent Commander — global AP boost", () => {
			const spec = WAR_CALLER_SPECIALIZATIONS[3]!;
			expect(spec.markLevel).toBe(5);
			expect(spec.effectType).toBe("supreme_command");
			expect(spec.description).toContain("+1 AP");
		});

		it("v2 upgrades replace Mark III and IV", () => {
			expect(WAR_CALLER_V2_UPGRADES).toHaveLength(2);
			expect(WAR_CALLER_V2_UPGRADES[0]!.markLevel).toBe(3);
			expect(WAR_CALLER_V2_UPGRADES[0]!.effectType).toBe("overcharge_wave");
			expect(WAR_CALLER_V2_UPGRADES[1]!.markLevel).toBe(4);
			expect(WAR_CALLER_V2_UPGRADES[1]!.effectType).toBe("tactical_supremacy");
		});

		it("v2 Mark IV (Tactical Supremacy) is strictly better than base (Coordination Matrix)", () => {
			const base = WAR_CALLER_SPECIALIZATIONS[2]!;
			const v2 = WAR_CALLER_V2_UPGRADES[1]!;
			expect(v2.effectValue).toBeGreaterThan(base.effectValue);
		});
	});

	// ─── Radial menu actions ──────────────────────────────────────────

	describe("track actions", () => {
		it("Field Medic has self_repair and revive actions", () => {
			expect(FIELD_MEDIC_ACTIONS).toHaveLength(2);
			expect(FIELD_MEDIC_ACTIONS[0]!.id).toBe("self_repair");
			expect(FIELD_MEDIC_ACTIONS[1]!.id).toBe("revive");
		});

		it("Signal Booster has counter_scan and jam_signal actions", () => {
			expect(SIGNAL_BOOSTER_ACTIONS).toHaveLength(2);
			expect(SIGNAL_BOOSTER_ACTIONS[0]!.id).toBe("counter_scan");
			expect(SIGNAL_BOOSTER_ACTIONS[1]!.id).toBe("jam_signal");
		});

		it("War Caller has disruption_wave and rally actions", () => {
			expect(WAR_CALLER_ACTIONS).toHaveLength(2);
			expect(WAR_CALLER_ACTIONS[0]!.id).toBe("disruption_wave");
			expect(WAR_CALLER_ACTIONS[1]!.id).toBe("rally");
		});

		it("all track actions have valid ClassActionDef fields", () => {
			const allActions = [
				...FIELD_MEDIC_ACTIONS,
				...SIGNAL_BOOSTER_ACTIONS,
				...WAR_CALLER_ACTIONS,
			];
			for (const action of allActions) {
				expect(action.id).toBeTruthy();
				expect(action.label).toBeTruthy();
				expect(action.icon).toBeTruthy();
				expect(action.category).toBe("utility");
				expect(action.apCost).toBeGreaterThanOrEqual(1);
				expect(action.description).toBeTruthy();
			}
		});

		it("revive action costs 2 AP (expensive)", () => {
			expect(FIELD_MEDIC_ACTIONS[1]!.apCost).toBe(2);
			expect(FIELD_MEDIC_ACTIONS[1]!.requiresStaging).toBe(true);
		});
	});

	// ─── Tech tree techs ─────────────────────────────────────────────

	describe("tech tree additions", () => {
		it("has 2 gating techs", () => {
			expect(SUPPORT_TRACK_TECHS).toHaveLength(2);
		});

		it("tier 2 tech unlocks base specializations", () => {
			const unlock = SUPPORT_TRACK_TECHS[0]!;
			expect(unlock.id).toBe("advanced_support_protocols");
			expect(unlock.tier).toBe(2);
			expect(unlock.prerequisites).toContain("reinforced_chassis");
		});

		it("tier 4 tech unlocks v2 upgrades", () => {
			const upgrade = SUPPORT_TRACK_TECHS[1]!;
			expect(upgrade.id).toBe("transcendent_support_matrix");
			expect(upgrade.tier).toBe(4);
			expect(upgrade.prerequisites).toContain("advanced_support_protocols");
			expect(upgrade.prerequisites).toContain("quantum_processors");
		});

		it("techs have valid costs and research times", () => {
			for (const tech of SUPPORT_TRACK_TECHS) {
				expect(Object.keys(tech.cost).length).toBeGreaterThan(0);
				expect(tech.turnsToResearch).toBeGreaterThanOrEqual(4);
			}
		});
	});

	// ─── Query helpers ────────────────────────────────────────────────

	describe("getTrackSpecializations", () => {
		it("returns empty for Mark I", () => {
			expect(getTrackSpecializations("field_medic", 1)).toHaveLength(0);
			expect(getTrackSpecializations("signal_booster", 1)).toHaveLength(0);
			expect(getTrackSpecializations("war_caller", 1)).toHaveLength(0);
		});

		it("returns Mark II spec at level 2", () => {
			const specs = getTrackSpecializations("field_medic", 2);
			expect(specs).toHaveLength(1);
			expect(specs[0]!.effectType).toBe("triage_protocols");
		});

		it("returns Mark II + III specs at level 3", () => {
			const specs = getTrackSpecializations("signal_booster", 3);
			expect(specs).toHaveLength(2);
			expect(specs[0]!.effectType).toBe("relay_amplifier");
			expect(specs[1]!.effectType).toBe("counter_stealth");
		});

		it("returns all 4 specs at Mark V", () => {
			const specs = getTrackSpecializations("war_caller", 5);
			expect(specs).toHaveLength(4);
			expect(specs[3]!.effectType).toBe("supreme_command");
		});

		it("with useV2 = true, replaces Mark III/IV with v2 versions", () => {
			const specs = getTrackSpecializations("field_medic", 5, true);
			expect(specs).toHaveLength(4);

			// Mark III should be nanite_regen (v2), not regen_aura (base)
			const mark3 = specs.find((s) => s.markLevel === 3);
			expect(mark3!.effectType).toBe("nanite_regen");

			// Mark IV should be failsafe_override (v2), not emergency_stabilize (base)
			const mark4 = specs.find((s) => s.markLevel === 4);
			expect(mark4!.effectType).toBe("failsafe_override");
		});

		it("v2 mode still includes Mark II and V (not replaced)", () => {
			const specs = getTrackSpecializations("signal_booster", 5, true);
			// Mark II (relay_amplifier) + Mark III v2 + Mark IV v2 + Mark V (omniscient_relay) = 4
			expect(specs).toHaveLength(4);

			const effectTypes = specs.map((s) => s.effectType);
			expect(effectTypes).toContain("relay_amplifier"); // Mark II base
			expect(effectTypes).toContain("omniscient_relay"); // Mark V base
			expect(effectTypes).toContain("quantum_counter_stealth"); // v2
			expect(effectTypes).toContain("blackout_pulse"); // v2
		});
	});

	describe("getTrackActions", () => {
		it("returns correct actions for each track", () => {
			expect(getTrackActions("field_medic")).toBe(FIELD_MEDIC_ACTIONS);
			expect(getTrackActions("signal_booster")).toBe(SIGNAL_BOOSTER_ACTIONS);
			expect(getTrackActions("war_caller")).toBe(WAR_CALLER_ACTIONS);
		});
	});

	// ─── Cross-track uniqueness ───────────────────────────────────────

	describe("cross-track uniqueness", () => {
		it("all effect types across all tracks are unique", () => {
			const allSpecs = [
				...FIELD_MEDIC_SPECIALIZATIONS,
				...SIGNAL_BOOSTER_SPECIALIZATIONS,
				...WAR_CALLER_SPECIALIZATIONS,
			];
			const effectTypes = allSpecs.map((s) => s.effectType);
			expect(new Set(effectTypes).size).toBe(effectTypes.length);
		});

		it("all action IDs across all tracks are unique", () => {
			const allActions = [
				...FIELD_MEDIC_ACTIONS,
				...SIGNAL_BOOSTER_ACTIONS,
				...WAR_CALLER_ACTIONS,
			];
			const ids = allActions.map((a) => a.id);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it("v2 effect types are distinct from base effect types", () => {
			const baseTypes = [
				...FIELD_MEDIC_SPECIALIZATIONS,
				...SIGNAL_BOOSTER_SPECIALIZATIONS,
				...WAR_CALLER_SPECIALIZATIONS,
			].map((s) => s.effectType);

			const v2Types = [
				...FIELD_MEDIC_V2_UPGRADES,
				...SIGNAL_BOOSTER_V2_UPGRADES,
				...WAR_CALLER_V2_UPGRADES,
			].map((s) => s.effectType);

			for (const v2Type of v2Types) {
				expect(baseTypes).not.toContain(v2Type);
			}
		});

		it("all specializations have the correct track assigned", () => {
			for (const spec of FIELD_MEDIC_SPECIALIZATIONS) {
				expect(spec.track).toBe("field_medic");
			}
			for (const spec of SIGNAL_BOOSTER_SPECIALIZATIONS) {
				expect(spec.track).toBe("signal_booster");
			}
			for (const spec of WAR_CALLER_SPECIALIZATIONS) {
				expect(spec.track).toBe("war_caller");
			}
		});
	});
});
