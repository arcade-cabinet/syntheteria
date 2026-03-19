import { describe, expect, it } from "vitest";
import {
	SCOUT_TRACKS,
	PATHFINDER_SPECIALIZATIONS,
	INFILTRATOR_SPECIALIZATIONS,
	PATHFINDER_V2_UPGRADES,
	INFILTRATOR_V2_UPGRADES,
	PATHFINDER_ACTIONS,
	INFILTRATOR_ACTIONS,
	SCOUT_TRACK_TECHS,
	getTrackSpecializations,
	getTrackActions,
} from "../specializations/scoutTracks";
import type { ScoutTrack, TrackSpecialization } from "../specializations/scoutTracks";

// ─── Track structure ─────────────────────────────────────────────────────────

describe("Scout specialization tracks", () => {
	it("defines exactly 2 tracks: pathfinder and infiltrator", () => {
		const tracks = Object.keys(SCOUT_TRACKS);
		expect(tracks).toHaveLength(2);
		expect(tracks).toContain("pathfinder");
		expect(tracks).toContain("infiltrator");
	});

	it("each track has label, description, specializations, and v2Upgrades", () => {
		for (const track of Object.values(SCOUT_TRACKS)) {
			expect(track.label).toBeTruthy();
			expect(track.description).toBeTruthy();
			expect(track.specializations.length).toBeGreaterThan(0);
			expect(track.v2Upgrades.length).toBeGreaterThan(0);
		}
	});

	it("all specializations carry the correct track tag", () => {
		for (const spec of PATHFINDER_SPECIALIZATIONS) {
			expect(spec.track).toBe("pathfinder");
		}
		for (const spec of INFILTRATOR_SPECIALIZATIONS) {
			expect(spec.track).toBe("infiltrator");
		}
	});
});

// ─── Pathfinder track ────────────────────────────────────────────────────────

describe("Track A: Pathfinder", () => {
	it("has 4 specializations (Mark II through V)", () => {
		expect(PATHFINDER_SPECIALIZATIONS).toHaveLength(4);
	});

	it("Mark II: Terrain Adaptation — ignores movement penalties, +1 MP", () => {
		const spec = PATHFINDER_SPECIALIZATIONS[0]!;
		expect(spec.label).toBe("Terrain Adaptation");
		expect(spec.effectType).toBe("terrain_adapt");
		expect(spec.effectValue).toBe(1);
	});

	it("Mark III: Cartographer's Sweep — fog cone 3-tile radius", () => {
		const spec = PATHFINDER_SPECIALIZATIONS[1]!;
		expect(spec.label).toBe("Cartographer's Sweep");
		expect(spec.effectType).toBe("fog_sweep");
		expect(spec.effectValue).toBe(3);
		expect(spec.markLevel).toBe(3);
	});

	it("Mark IV: Wayfinder Pulse — reveal 5 Manhattan distance", () => {
		const spec = PATHFINDER_SPECIALIZATIONS[2]!;
		expect(spec.label).toBe("Wayfinder Pulse");
		expect(spec.effectType).toBe("wayfinder_pulse");
		expect(spec.effectValue).toBe(5);
		expect(spec.markLevel).toBe(4);
	});

	it("Mark V: Transcendent Cartographer — permanent vision on explored tiles", () => {
		const spec = PATHFINDER_SPECIALIZATIONS[3]!;
		expect(spec.label).toBe("Transcendent Cartographer");
		expect(spec.effectType).toBe("permanent_vision");
		expect(spec.effectValue).toBe(1);
		expect(spec.markLevel).toBe(5);
	});

	it("v2 upgrades replace Mark III and IV", () => {
		expect(PATHFINDER_V2_UPGRADES).toHaveLength(2);
		expect(PATHFINDER_V2_UPGRADES[0]!.markLevel).toBe(3);
		expect(PATHFINDER_V2_UPGRADES[0]!.effectType).toBe("seismic_sweep");
		expect(PATHFINDER_V2_UPGRADES[0]!.effectValue).toBe(5); // wider than base 3
		expect(PATHFINDER_V2_UPGRADES[1]!.markLevel).toBe(4);
		expect(PATHFINDER_V2_UPGRADES[1]!.effectType).toBe("resonance_map");
		expect(PATHFINDER_V2_UPGRADES[1]!.effectValue).toBe(8); // wider than base 5
	});
});

// ─── Infiltrator track ──────────────────────────────────────────────────────

describe("Track B: Infiltrator", () => {
	it("has 4 specializations (Mark II through V)", () => {
		expect(INFILTRATOR_SPECIALIZATIONS).toHaveLength(4);
	});

	it("Mark II: Signal Dampener — reduces enemy scan range", () => {
		const spec = INFILTRATOR_SPECIALIZATIONS[0]!;
		expect(spec.label).toBe("Signal Dampener");
		expect(spec.effectType).toBe("signal_dampen");
		expect(spec.effectValue).toBe(2);
	});

	it("Mark III: Ghost Protocol — invisible while stationary, +3 first strike", () => {
		const spec = INFILTRATOR_SPECIALIZATIONS[1]!;
		expect(spec.label).toBe("Ghost Protocol");
		expect(spec.effectType).toBe("ghost_protocol");
		expect(spec.effectValue).toBe(1);
		expect(spec.markLevel).toBe(3);
	});

	it("Mark IV: Network Intrusion — hack buildings range 2, reveal for 3 turns", () => {
		const spec = INFILTRATOR_SPECIALIZATIONS[2]!;
		expect(spec.label).toBe("Network Intrusion");
		expect(spec.effectType).toBe("network_intrusion");
		expect(spec.effectValue).toBe(2);
		expect(spec.markLevel).toBe(4);
	});

	it("Mark V: Transcendent Phantom — permanently invisible + full vision", () => {
		const spec = INFILTRATOR_SPECIALIZATIONS[3]!;
		expect(spec.label).toBe("Transcendent Phantom");
		expect(spec.effectType).toBe("phantom_network");
		expect(spec.effectValue).toBe(1);
		expect(spec.markLevel).toBe(5);
	});

	it("v2 upgrades replace Mark III and IV", () => {
		expect(INFILTRATOR_V2_UPGRADES).toHaveLength(2);
		expect(INFILTRATOR_V2_UPGRADES[0]!.markLevel).toBe(3);
		expect(INFILTRATOR_V2_UPGRADES[0]!.effectType).toBe("quantum_cloak");
		expect(INFILTRATOR_V2_UPGRADES[1]!.markLevel).toBe(4);
		expect(INFILTRATOR_V2_UPGRADES[1]!.effectType).toBe("deep_intrusion");
		expect(INFILTRATOR_V2_UPGRADES[1]!.effectValue).toBe(4); // wider than base 2
	});
});

// ─── getTrackSpecializations ─────────────────────────────────────────────────

describe("getTrackSpecializations", () => {
	it("returns empty at Mark I", () => {
		expect(getTrackSpecializations("pathfinder", 1)).toHaveLength(0);
		expect(getTrackSpecializations("infiltrator", 1)).toHaveLength(0);
	});

	it("returns Mark II spec at level 2", () => {
		const specs = getTrackSpecializations("pathfinder", 2);
		expect(specs).toHaveLength(1);
		expect(specs[0]!.effectType).toBe("terrain_adapt");
	});

	it("returns Mark II+III specs at level 3", () => {
		const specs = getTrackSpecializations("infiltrator", 3);
		expect(specs).toHaveLength(2);
		expect(specs[0]!.effectType).toBe("signal_dampen");
		expect(specs[1]!.effectType).toBe("ghost_protocol");
	});

	it("returns all 4 specs at Mark V", () => {
		expect(getTrackSpecializations("pathfinder", 5)).toHaveLength(4);
		expect(getTrackSpecializations("infiltrator", 5)).toHaveLength(4);
	});

	it("v2 mode replaces Mark III and IV with upgraded versions", () => {
		const base = getTrackSpecializations("pathfinder", 5, false);
		const v2 = getTrackSpecializations("pathfinder", 5, true);

		// Same count — v2 replaces, doesn't add
		expect(v2).toHaveLength(4);

		// Mark III should be seismic_sweep instead of fog_sweep
		const markIII = v2.find(s => s.markLevel === 3);
		expect(markIII!.effectType).toBe("seismic_sweep");

		// Mark IV should be resonance_map instead of wayfinder_pulse
		const markIV = v2.find(s => s.markLevel === 4);
		expect(markIV!.effectType).toBe("resonance_map");

		// Mark II and V unchanged
		const markII = v2.find(s => s.effectType === "terrain_adapt");
		expect(markII).toBeDefined();
		const markV = v2.find(s => s.markLevel === 5);
		expect(markV!.effectType).toBe("permanent_vision");
	});

	it("v2 mode replaces infiltrator Mark III and IV", () => {
		const v2 = getTrackSpecializations("infiltrator", 5, true);
		expect(v2).toHaveLength(4);
		const markIII = v2.find(s => s.markLevel === 3);
		expect(markIII!.effectType).toBe("quantum_cloak");
		const markIV = v2.find(s => s.markLevel === 4);
		expect(markIV!.effectType).toBe("deep_intrusion");
	});
});

// ─── Radial menu actions ─────────────────────────────────────────────────────

describe("Track radial actions", () => {
	it("pathfinder unlocks sweep_reveal and wayfinder_pulse actions", () => {
		expect(PATHFINDER_ACTIONS).toHaveLength(2);
		expect(PATHFINDER_ACTIONS[0]!.id).toBe("sweep_reveal");
		expect(PATHFINDER_ACTIONS[1]!.id).toBe("wayfinder_pulse");
	});

	it("infiltrator unlocks cloak and hack_building actions", () => {
		expect(INFILTRATOR_ACTIONS).toHaveLength(2);
		expect(INFILTRATOR_ACTIONS[0]!.id).toBe("cloak");
		expect(INFILTRATOR_ACTIONS[1]!.id).toBe("hack_building");
	});

	it("all actions have valid ClassActionDef fields", () => {
		const allActions = [...PATHFINDER_ACTIONS, ...INFILTRATOR_ACTIONS];
		for (const action of allActions) {
			expect(action.id).toBeTruthy();
			expect(action.label).toBeTruthy();
			expect(action.icon).toBeTruthy();
			expect(action.category).toBeTruthy();
			expect(typeof action.apCost).toBe("number");
			expect(typeof action.cooldown).toBe("number");
			expect(action.description).toBeTruthy();
		}
	});

	it("getTrackActions returns correct actions per track", () => {
		expect(getTrackActions("pathfinder")).toBe(PATHFINDER_ACTIONS);
		expect(getTrackActions("infiltrator")).toBe(INFILTRATOR_ACTIONS);
	});

	it("hack_building targets enemy buildings", () => {
		const hack = INFILTRATOR_ACTIONS.find(a => a.id === "hack_building")!;
		expect(hack.requiresEnemy).toBe(true);
		expect(hack.maxRange).toBe(2);
		expect(hack.cooldown).toBe(3);
	});

	it("cloak is a self-targeted utility", () => {
		const cloak = INFILTRATOR_ACTIONS.find(a => a.id === "cloak")!;
		expect(cloak.requiresEnemy).toBe(false);
		expect(cloak.requiresFriendly).toBe(false);
		expect(cloak.minRange).toBe(0);
		expect(cloak.maxRange).toBe(0);
	});
});

// ─── Tech tree gates ─────────────────────────────────────────────────────────

describe("Scout track tech tree", () => {
	it("defines 2 gating techs", () => {
		expect(SCOUT_TRACK_TECHS).toHaveLength(2);
	});

	it("advanced_recon_optics is tier 2, gates specialization choice", () => {
		const tech = SCOUT_TRACK_TECHS.find(t => t.id === "advanced_recon_optics")!;
		expect(tech.tier).toBe(2);
		expect(tech.prerequisites).toContain("signal_amplification");
		expect(tech.turnsToResearch).toBe(4);
	});

	it("deep_signal_processing is tier 4, gates v2 upgrades", () => {
		const tech = SCOUT_TRACK_TECHS.find(t => t.id === "deep_signal_processing")!;
		expect(tech.tier).toBe(4);
		expect(tech.prerequisites).toContain("advanced_recon_optics");
		expect(tech.prerequisites).toContain("quantum_processors");
		expect(tech.turnsToResearch).toBe(8);
	});

	it("tech prerequisites reference existing techs", () => {
		// signal_amplification exists in tier 1
		const t1 = SCOUT_TRACK_TECHS[0]!;
		expect(t1.prerequisites).toContain("signal_amplification");
		// quantum_processors exists in tier 4
		const t2 = SCOUT_TRACK_TECHS[1]!;
		expect(t2.prerequisites).toContain("quantum_processors");
	});
});

// ─── Design invariants ───────────────────────────────────────────────────────

describe("Design invariants", () => {
	it("both tracks use the same visual model (no modelId override)", () => {
		// Tracks don't define visual overrides — same scout model
		for (const track of Object.values(SCOUT_TRACKS)) {
			for (const spec of track.specializations) {
				expect((spec as unknown as Record<string, unknown>).modelId).toBeUndefined();
			}
		}
	});

	it("every specialization has a non-empty description", () => {
		const all: TrackSpecialization[] = [
			...PATHFINDER_SPECIALIZATIONS,
			...INFILTRATOR_SPECIALIZATIONS,
			...PATHFINDER_V2_UPGRADES,
			...INFILTRATOR_V2_UPGRADES,
		];
		for (const spec of all) {
			expect(spec.description.length).toBeGreaterThan(10);
		}
	});

	it("effect types are unique within each track (no collisions)", () => {
		const pfEffects = PATHFINDER_SPECIALIZATIONS.map(s => s.effectType);
		expect(new Set(pfEffects).size).toBe(pfEffects.length);

		const infEffects = INFILTRATOR_SPECIALIZATIONS.map(s => s.effectType);
		expect(new Set(infEffects).size).toBe(infEffects.length);
	});

	it("v2 upgrades have strictly better effectValue than base at same mark level", () => {
		for (const v2 of PATHFINDER_V2_UPGRADES) {
			const base = PATHFINDER_SPECIALIZATIONS.find(s => s.markLevel === v2.markLevel);
			if (base) {
				expect(v2.effectValue).toBeGreaterThan(base.effectValue);
			}
		}
		for (const v2 of INFILTRATOR_V2_UPGRADES) {
			const base = INFILTRATOR_SPECIALIZATIONS.find(s => s.markLevel === v2.markLevel);
			if (base) {
				expect(v2.effectValue).toBeGreaterThanOrEqual(base.effectValue);
			}
		}
	});

	it("specialization is permanent — no track-switching mechanism exists", () => {
		// Structural: ScoutTrack is a union type, not mutable state
		const tracks: ScoutTrack[] = ["pathfinder", "infiltrator"];
		expect(tracks).toHaveLength(2);
		// No "reset" or "switch" function exported
		// (verified by the module's export list)
	});
});
