import { describe, expect, it } from "vitest";
import {
	getInfantryTrackActions,
	getInfantryTrackSpecializations,
	INFANTRY_TRACK_TECHS,
	INFANTRY_TRACKS,
	type InfantryTrack,
	SHOCK_TROOPER_ACTIONS,
	SHOCK_TROOPER_SPECIALIZATIONS,
	SHOCK_TROOPER_V2_UPGRADES,
	VANGUARD_ACTIONS,
	VANGUARD_SPECIALIZATIONS,
	VANGUARD_V2_UPGRADES,
} from "../specializations/infantryTracks";

// ─── Track structure ─────────────────────────────────────────────────────────

describe("Infantry track structure", () => {
	it("has exactly 3 tracks: vanguard, shock_trooper, and marine", () => {
		const tracks = Object.keys(INFANTRY_TRACKS) as InfantryTrack[];
		expect(tracks).toHaveLength(3);
		expect(tracks).toContain("vanguard");
		expect(tracks).toContain("shock_trooper");
		expect(tracks).toContain("marine");
	});

	it("each track has label, description, specializations, and v2Upgrades", () => {
		for (const [id, track] of Object.entries(INFANTRY_TRACKS)) {
			expect(track.label).toBeTruthy();
			expect(track.description).toBeTruthy();
			expect(track.specializations.length).toBeGreaterThanOrEqual(4);
			if (id !== "marine") {
				expect(track.v2Upgrades.length).toBeGreaterThanOrEqual(2);
			}
		}
	});
});

// ─── Track A: Vanguard specializations ──────────────────────────────────────

describe("Vanguard specializations", () => {
	it("has 4 specializations (Mark II through V)", () => {
		expect(VANGUARD_SPECIALIZATIONS).toHaveLength(4);
	});

	it("Mark II: Hardened Plating — HP and defense boost", () => {
		const spec = VANGUARD_SPECIALIZATIONS[0]!;
		expect(spec.track).toBe("vanguard");
		expect(spec.label).toBe("Hardened Plating");
		expect(spec.effectType).toBe("hardened_plating");
		expect(spec.effectValue).toBe(3);
	});

	it("Mark III: Threat Beacon — taunt/aggro", () => {
		const spec = VANGUARD_SPECIALIZATIONS[1]!;
		expect(spec.markLevel).toBe(3);
		expect(spec.effectType).toBe("threat_beacon");
		expect(spec.effectValue).toBe(2);
	});

	it("Mark IV: Reactive Armor — damage reflection", () => {
		const spec = VANGUARD_SPECIALIZATIONS[2]!;
		expect(spec.markLevel).toBe(4);
		expect(spec.effectType).toBe("reactive_armor");
		expect(spec.effectValue).toBe(2);
	});

	it("Mark V: Transcendent Bulwark — zone control aura", () => {
		const spec = VANGUARD_SPECIALIZATIONS[3]!;
		expect(spec.markLevel).toBe(5);
		expect(spec.effectType).toBe("bulwark_aura");
		expect(spec.effectValue).toBe(2);
	});

	it("all specs have the vanguard track tag", () => {
		for (const spec of VANGUARD_SPECIALIZATIONS) {
			expect(spec.track).toBe("vanguard");
		}
	});
});

// ─── Track B: Shock Trooper specializations ─────────────────────────────────

describe("Shock Trooper specializations", () => {
	it("has 4 specializations (Mark II through V)", () => {
		expect(SHOCK_TROOPER_SPECIALIZATIONS).toHaveLength(4);
	});

	it("Mark II: Impact Charge — damage on engage", () => {
		const spec = SHOCK_TROOPER_SPECIALIZATIONS[0]!;
		expect(spec.track).toBe("shock_trooper");
		expect(spec.label).toBe("Impact Charge");
		expect(spec.effectType).toBe("impact_charge");
		expect(spec.effectValue).toBe(2);
	});

	it("Mark III: Weak Point Analysis — armor piercing", () => {
		const spec = SHOCK_TROOPER_SPECIALIZATIONS[1]!;
		expect(spec.markLevel).toBe(3);
		expect(spec.effectType).toBe("weak_point");
		expect(spec.effectValue).toBe(2);
	});

	it("Mark IV: Execution Protocol — finisher strikes", () => {
		const spec = SHOCK_TROOPER_SPECIALIZATIONS[2]!;
		expect(spec.markLevel).toBe(4);
		expect(spec.effectType).toBe("execution");
		expect(spec.effectValue).toBe(4);
	});

	it("Mark V: Transcendent Striker — chain kill resets", () => {
		const spec = SHOCK_TROOPER_SPECIALIZATIONS[3]!;
		expect(spec.markLevel).toBe(5);
		expect(spec.effectType).toBe("chain_kill");
		expect(spec.effectValue).toBe(1);
	});

	it("all specs have the shock_trooper track tag", () => {
		for (const spec of SHOCK_TROOPER_SPECIALIZATIONS) {
			expect(spec.track).toBe("shock_trooper");
		}
	});
});

// ─── v2 Upgrades ─────────────────────────────────────────────────────────────

describe("v2 upgrades", () => {
	it("Vanguard v2 has 2 upgrades at Mark III and IV", () => {
		expect(VANGUARD_V2_UPGRADES).toHaveLength(2);
		expect(VANGUARD_V2_UPGRADES[0]!.markLevel).toBe(3);
		expect(VANGUARD_V2_UPGRADES[1]!.markLevel).toBe(4);
	});

	it("Vanguard v2 Mark III: Graviton Anchor (replaces Threat Beacon)", () => {
		const spec = VANGUARD_V2_UPGRADES[0]!;
		expect(spec.effectType).toBe("graviton_anchor");
		expect(spec.effectValue).toBe(3);
		expect(spec.track).toBe("vanguard");
	});

	it("Vanguard v2 Mark IV: Ablative Shell (replaces Reactive Armor)", () => {
		const spec = VANGUARD_V2_UPGRADES[1]!;
		expect(spec.effectType).toBe("ablative_shell");
		expect(spec.effectValue).toBe(3);
		expect(spec.track).toBe("vanguard");
	});

	it("Shock Trooper v2 has 2 upgrades at Mark III and IV", () => {
		expect(SHOCK_TROOPER_V2_UPGRADES).toHaveLength(2);
		expect(SHOCK_TROOPER_V2_UPGRADES[0]!.markLevel).toBe(3);
		expect(SHOCK_TROOPER_V2_UPGRADES[1]!.markLevel).toBe(4);
	});

	it("Shock Trooper v2 Mark III: Overclocked Servos (replaces Weak Point)", () => {
		const spec = SHOCK_TROOPER_V2_UPGRADES[0]!;
		expect(spec.effectType).toBe("overclocked_servos");
		expect(spec.effectValue).toBe(3);
		expect(spec.track).toBe("shock_trooper");
	});

	it("Shock Trooper v2 Mark IV: Termination Sequence (replaces Execution)", () => {
		const spec = SHOCK_TROOPER_V2_UPGRADES[1]!;
		expect(spec.effectType).toBe("termination_sequence");
		expect(spec.effectValue).toBe(5);
		expect(spec.track).toBe("shock_trooper");
	});

	it("v2 upgrades are strictly better than base versions", () => {
		// Vanguard: Graviton Anchor range 3 > Threat Beacon range 2
		expect(VANGUARD_V2_UPGRADES[0]!.effectValue).toBeGreaterThan(
			VANGUARD_SPECIALIZATIONS[1]!.effectValue,
		);
		// Vanguard: Ablative Shell reflect 3 > Reactive Armor reflect 2
		expect(VANGUARD_V2_UPGRADES[1]!.effectValue).toBeGreaterThan(
			VANGUARD_SPECIALIZATIONS[2]!.effectValue,
		);
		// Shock Trooper: Overclocked defense ignore 3 > Weak Point 2
		expect(SHOCK_TROOPER_V2_UPGRADES[0]!.effectValue).toBeGreaterThan(
			SHOCK_TROOPER_SPECIALIZATIONS[1]!.effectValue,
		);
		// Shock Trooper: Termination threshold 5 > Execution threshold 4
		expect(SHOCK_TROOPER_V2_UPGRADES[1]!.effectValue).toBeGreaterThan(
			SHOCK_TROOPER_SPECIALIZATIONS[2]!.effectValue,
		);
	});
});

// ─── Query helpers ───────────────────────────────────────────────────────────

describe("getInfantryTrackSpecializations", () => {
	it("returns empty at Mark I", () => {
		expect(getInfantryTrackSpecializations("vanguard", 1)).toHaveLength(0);
		expect(getInfantryTrackSpecializations("shock_trooper", 1)).toHaveLength(0);
	});

	it("returns Mark II spec at level 2", () => {
		const vSpecs = getInfantryTrackSpecializations("vanguard", 2);
		expect(vSpecs).toHaveLength(1);
		expect(vSpecs[0]!.effectType).toBe("hardened_plating");

		const sSpecs = getInfantryTrackSpecializations("shock_trooper", 2);
		expect(sSpecs).toHaveLength(1);
		expect(sSpecs[0]!.effectType).toBe("impact_charge");
	});

	it("returns Mark II + III specs at level 3", () => {
		const vSpecs = getInfantryTrackSpecializations("vanguard", 3);
		expect(vSpecs).toHaveLength(2);
		expect(vSpecs[1]!.effectType).toBe("threat_beacon");
	});

	it("returns Mark II + III + IV specs at level 4", () => {
		const specs = getInfantryTrackSpecializations("shock_trooper", 4);
		expect(specs).toHaveLength(3);
		expect(specs[2]!.effectType).toBe("execution");
	});

	it("returns all 4 specs at Mark V", () => {
		const vSpecs = getInfantryTrackSpecializations("vanguard", 5);
		expect(vSpecs).toHaveLength(4);
		expect(vSpecs[3]!.effectType).toBe("bulwark_aura");

		const sSpecs = getInfantryTrackSpecializations("shock_trooper", 5);
		expect(sSpecs).toHaveLength(4);
		expect(sSpecs[3]!.effectType).toBe("chain_kill");
	});

	it("v2 mode replaces Mark III/IV with upgraded versions", () => {
		const specs = getInfantryTrackSpecializations("vanguard", 5, true);
		expect(specs).toHaveLength(4);

		const effectTypes = specs.map((s) => s.effectType);
		// Mark II stays
		expect(effectTypes).toContain("hardened_plating");
		// v2 replaces Mark III
		expect(effectTypes).toContain("graviton_anchor");
		expect(effectTypes).not.toContain("threat_beacon");
		// v2 replaces Mark IV
		expect(effectTypes).toContain("ablative_shell");
		expect(effectTypes).not.toContain("reactive_armor");
		// Mark V stays
		expect(effectTypes).toContain("bulwark_aura");
	});

	it("v2 mode for shock trooper replaces correctly", () => {
		const specs = getInfantryTrackSpecializations("shock_trooper", 5, true);
		expect(specs).toHaveLength(4);

		const effectTypes = specs.map((s) => s.effectType);
		expect(effectTypes).toContain("impact_charge");
		expect(effectTypes).toContain("overclocked_servos");
		expect(effectTypes).not.toContain("weak_point");
		expect(effectTypes).toContain("termination_sequence");
		expect(effectTypes).not.toContain("execution");
		expect(effectTypes).toContain("chain_kill");
	});
});

// ─── Radial menu actions ─────────────────────────────────────────────────────

describe("Infantry track actions", () => {
	it("Vanguard has 2 actions: taunt and shield_wall", () => {
		expect(VANGUARD_ACTIONS).toHaveLength(2);
		expect(VANGUARD_ACTIONS[0]!.id).toBe("taunt");
		expect(VANGUARD_ACTIONS[1]!.id).toBe("shield_wall");
	});

	it("Shock Trooper has 2 actions: rush and execute", () => {
		expect(SHOCK_TROOPER_ACTIONS).toHaveLength(2);
		expect(SHOCK_TROOPER_ACTIONS[0]!.id).toBe("rush");
		expect(SHOCK_TROOPER_ACTIONS[1]!.id).toBe("execute");
	});

	it("all actions have required fields", () => {
		const allActions = [...VANGUARD_ACTIONS, ...SHOCK_TROOPER_ACTIONS];
		for (const action of allActions) {
			expect(action.id).toBeTruthy();
			expect(action.label).toBeTruthy();
			expect(action.icon).toBeTruthy();
			expect(action.category).toBe("combat");
			expect(action.apCost).toBeGreaterThanOrEqual(0);
			expect(action.description).toBeTruthy();
		}
	});

	it("getInfantryTrackActions returns correct actions", () => {
		expect(getInfantryTrackActions("vanguard")).toBe(VANGUARD_ACTIONS);
		expect(getInfantryTrackActions("shock_trooper")).toBe(
			SHOCK_TROOPER_ACTIONS,
		);
	});

	it("rush action has min range 2 (charge-style)", () => {
		const rush = SHOCK_TROOPER_ACTIONS[0]!;
		expect(rush.minRange).toBe(2);
		expect(rush.maxRange).toBe(3);
		expect(rush.requiresEnemy).toBe(true);
	});

	it("taunt is self-targeted (range 0)", () => {
		const taunt = VANGUARD_ACTIONS[0]!;
		expect(taunt.minRange).toBe(0);
		expect(taunt.maxRange).toBe(0);
		expect(taunt.requiresEnemy).toBe(false);
	});

	it("shield_wall has cooldown", () => {
		const wall = VANGUARD_ACTIONS[1]!;
		expect(wall.cooldown).toBe(2);
	});

	it("execute has cooldown 1 and requires adjacent enemy", () => {
		const exec = SHOCK_TROOPER_ACTIONS[1]!;
		expect(exec.cooldown).toBe(1);
		expect(exec.requiresAdjacent).toBe(true);
		expect(exec.requiresEnemy).toBe(true);
	});
});

// ─── Tech tree additions ─────────────────────────────────────────────────────

describe("Infantry track techs", () => {
	it("has 2 techs — gate and upgrade", () => {
		expect(INFANTRY_TRACK_TECHS).toHaveLength(2);
	});

	it("gate tech: combat_chassis_specialization (Tier 2)", () => {
		const gateTech = INFANTRY_TRACK_TECHS[0]!;
		expect(gateTech.id).toBe("combat_chassis_specialization");
		expect(gateTech.tier).toBe(2);
		expect(gateTech.prerequisites).toContain("reinforced_chassis");
		expect(gateTech.turnsToResearch).toBe(4);
	});

	it("upgrade tech: advanced_combat_doctrine (Tier 4)", () => {
		const upgradeTech = INFANTRY_TRACK_TECHS[1]!;
		expect(upgradeTech.id).toBe("advanced_combat_doctrine");
		expect(upgradeTech.tier).toBe(4);
		expect(upgradeTech.prerequisites).toContain(
			"combat_chassis_specialization",
		);
		expect(upgradeTech.prerequisites).toContain("mark_iii_components");
		expect(upgradeTech.turnsToResearch).toBe(8);
	});

	it("gate tech prerequisite exists in base tech tree", () => {
		// reinforced_chassis is a Tier 1 tech in techTreeDefs.ts
		const gateTech = INFANTRY_TRACK_TECHS[0]!;
		expect(gateTech.prerequisites).toEqual(["reinforced_chassis"]);
	});

	it("upgrade tech requires both gate tech and mark_iii_components", () => {
		const upgradeTech = INFANTRY_TRACK_TECHS[1]!;
		expect(upgradeTech.prerequisites).toHaveLength(2);
	});

	it("all techs have valid cost structure", () => {
		for (const tech of INFANTRY_TRACK_TECHS) {
			expect(Object.keys(tech.cost).length).toBeGreaterThan(0);
			for (const cost of Object.values(tech.cost)) {
				expect(cost).toBeGreaterThan(0);
			}
		}
	});

	it("upgrade tech costs more than gate tech", () => {
		const gateCost = Object.values(INFANTRY_TRACK_TECHS[0]!.cost).reduce(
			(a, b) => a + b,
			0,
		);
		const upgradeCost = Object.values(INFANTRY_TRACK_TECHS[1]!.cost).reduce(
			(a, b) => a + b,
			0,
		);
		expect(upgradeCost).toBeGreaterThan(gateCost);
	});
});

// ─── Design constraints ──────────────────────────────────────────────────────

describe("Design constraints", () => {
	it("all specialization effectTypes are unique within a track", () => {
		for (const track of Object.values(INFANTRY_TRACKS)) {
			const effectTypes = track.specializations.map((s) => s.effectType);
			expect(new Set(effectTypes).size).toBe(effectTypes.length);
		}
	});

	it("all specialization effectTypes are unique across v2 upgrades", () => {
		for (const track of Object.values(INFANTRY_TRACKS)) {
			const v2Types = track.v2Upgrades.map((s) => s.effectType);
			expect(new Set(v2Types).size).toBe(v2Types.length);
		}
	});

	it("v2 upgrades do not duplicate base effectTypes", () => {
		for (const track of Object.values(INFANTRY_TRACKS)) {
			const baseTypes = new Set(track.specializations.map((s) => s.effectType));
			for (const v2 of track.v2Upgrades) {
				expect(baseTypes.has(v2.effectType)).toBe(false);
			}
		}
	});

	it("all tech IDs are unique", () => {
		const ids = INFANTRY_TRACK_TECHS.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("all radial action IDs are unique across both tracks", () => {
		const allIds = [...VANGUARD_ACTIONS, ...SHOCK_TROOPER_ACTIONS].map(
			(a) => a.id,
		);
		expect(new Set(allIds).size).toBe(allIds.length);
	});

	it("Mark V abilities are transcendence-level (strong passives)", () => {
		// Vanguard transcendence should be an aura effect
		const vTranscend = VANGUARD_SPECIALIZATIONS[3]!;
		expect(vTranscend.markLevel).toBe(5);
		expect(vTranscend.effectType).toContain("aura");

		// Shock Trooper transcendence should be a kill-chain effect
		const sTranscend = SHOCK_TROOPER_SPECIALIZATIONS[3]!;
		expect(sTranscend.markLevel).toBe(5);
		expect(sTranscend.effectType).toContain("chain");
	});

	it("tracks offer opposing fantasies: tank vs glass cannon", () => {
		// Vanguard should have defense/HP-related descriptions
		const vDescriptions = VANGUARD_SPECIALIZATIONS.map(
			(s) => s.description,
		).join(" ");
		expect(vDescriptions.toLowerCase()).toMatch(
			/defense|hp|damage.*back|absorb/,
		);

		// Shock Trooper should have attack/damage-related descriptions
		const sDescriptions = SHOCK_TROOPER_SPECIALIZATIONS.map(
			(s) => s.description,
		).join(" ");
		expect(sDescriptions.toLowerCase()).toMatch(/damage|attack|kill/);
	});
});
