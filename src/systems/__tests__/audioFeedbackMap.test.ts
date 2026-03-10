/**
 * Unit tests for audioFeedbackMap.ts — game event to sound cue mapping.
 *
 * Paper playtesting revealed zero audio feedback in the game. These tests
 * ensure every core action has a mapped sound cue and that the audio
 * pipeline (cooldowns, volume mixing, spatial positioning) works correctly.
 */

import {
	getSoundCues,
	getActionMapping,
	getAllActions,
	getActionsByCategory,
	setCategoryVolume,
	getCategoryVolume,
	setMasterVolume,
	getMasterVolume,
	reset,
} from "../audioFeedbackMap";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Sound mapping completeness — PAPER PLAYTEST ASSERTIONS
// ---------------------------------------------------------------------------

describe("sound mapping completeness", () => {
	it("has sounds for all harvest actions", () => {
		expect(getActionMapping("harvest_start")).not.toBeNull();
		expect(getActionMapping("harvest_loop")).not.toBeNull();
		expect(getActionMapping("harvest_complete")).not.toBeNull();
		expect(getActionMapping("deposit_depleted")).not.toBeNull();
	});

	it("has sounds for all compression actions", () => {
		expect(getActionMapping("compression_start")).not.toBeNull();
		expect(getActionMapping("compression_loop")).not.toBeNull();
		expect(getActionMapping("compression_slam")).not.toBeNull();
	});

	it("has sounds for all cube interactions", () => {
		expect(getActionMapping("cube_grab")).not.toBeNull();
		expect(getActionMapping("cube_drop")).not.toBeNull();
		expect(getActionMapping("cube_throw")).not.toBeNull();
		expect(getActionMapping("cube_stack")).not.toBeNull();
		expect(getActionMapping("cube_topple")).not.toBeNull();
	});

	it("has sounds for furnace actions", () => {
		expect(getActionMapping("furnace_deposit")).not.toBeNull();
		expect(getActionMapping("furnace_ignite")).not.toBeNull();
		expect(getActionMapping("furnace_loop")).not.toBeNull();
		expect(getActionMapping("furnace_complete")).not.toBeNull();
	});

	it("has sounds for movement", () => {
		expect(getActionMapping("footstep_metal")).not.toBeNull();
		expect(getActionMapping("footstep_dirt")).not.toBeNull();
	});

	it("has sounds for combat", () => {
		expect(getActionMapping("weapon_fire")).not.toBeNull();
		expect(getActionMapping("weapon_hit")).not.toBeNull();
		expect(getActionMapping("damage_taken")).not.toBeNull();
		expect(getActionMapping("entity_death")).not.toBeNull();
	});

	it("has sounds for UI feedback", () => {
		expect(getActionMapping("menu_open")).not.toBeNull();
		expect(getActionMapping("menu_select")).not.toBeNull();
		expect(getActionMapping("notification")).not.toBeNull();
		expect(getActionMapping("achievement")).not.toBeNull();
	});

	it("has sounds for environment", () => {
		expect(getActionMapping("lightning_strike")).not.toBeNull();
		expect(getActionMapping("rain_ambient")).not.toBeNull();
	});

	// Every core loop step must have audio feedback
	it("covers the entire core loop with audio", () => {
		const coreLoopActions = [
			"harvest_start", "harvest_loop", "harvest_complete",
			"compression_start", "compression_loop", "compression_slam",
			"cube_grab", "cube_drop",
			"furnace_deposit", "furnace_complete",
		];
		for (const action of coreLoopActions) {
			expect(getActionMapping(action)).not.toBeNull();
		}
	});
});

// ---------------------------------------------------------------------------
// getSoundCues
// ---------------------------------------------------------------------------

describe("getSoundCues", () => {
	it("returns cues for valid action", () => {
		const cues = getSoundCues("cube_grab", { x: 1, y: 0, z: 1 }, 0);
		expect(cues.length).toBeGreaterThanOrEqual(1);
		expect(cues[0].soundId).toBe("magnetic_grab");
	});

	it("returns empty for unknown action", () => {
		const cues = getSoundCues("nonexistent_action", null, 0);
		expect(cues).toHaveLength(0);
	});

	it("includes secondary sound when defined", () => {
		const cues = getSoundCues("harvest_complete", null, 0);
		expect(cues.length).toBe(2);
		expect(cues[1].soundId).toBe("powder_settle");
	});

	it("secondary sound is quieter than primary", () => {
		const cues = getSoundCues("compression_slam", null, 0);
		expect(cues.length).toBe(2);
		expect(cues[1].volume).toBeLessThan(cues[0].volume);
	});

	it("applies spatial position", () => {
		const pos = { x: 10, y: 2, z: 5 };
		const cues = getSoundCues("cube_drop", pos, 0);
		expect(cues[0].position).toEqual(pos);
	});

	it("null position for UI sounds", () => {
		const cues = getSoundCues("menu_open", null, 0);
		expect(cues[0].position).toBeNull();
	});

	it("respects cooldown — blocks rapid re-play", () => {
		const cues1 = getSoundCues("cube_grab", null, 0);
		expect(cues1.length).toBeGreaterThan(0);

		// Immediately again — should be blocked (cooldown 0.2s)
		const cues2 = getSoundCues("cube_grab", null, 0.1);
		expect(cues2).toHaveLength(0);
	});

	it("allows play after cooldown expires", () => {
		getSoundCues("cube_grab", null, 0);
		const cues = getSoundCues("cube_grab", null, 1.0); // well past cooldown
		expect(cues.length).toBeGreaterThan(0);
	});

	it("sets loop flag for looping sounds", () => {
		const cues = getSoundCues("harvest_loop", null, 0);
		expect(cues[0].loop).toBe(true);
	});

	it("sets loop=false for one-shot sounds", () => {
		const cues = getSoundCues("cube_grab", null, 0);
		expect(cues[0].loop).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Volume mixing
// ---------------------------------------------------------------------------

describe("volume mixing", () => {
	it("applies category volume", () => {
		setCategoryVolume("sfx_ui", 0.5);
		const cues = getSoundCues("menu_open", null, 0);
		const mapping = getActionMapping("menu_open")!;
		expect(cues[0].volume).toBeCloseTo(mapping.volume * 0.5);
	});

	it("applies master volume", () => {
		setMasterVolume(0.5);
		const cues = getSoundCues("cube_grab", null, 0);
		const mapping = getActionMapping("cube_grab")!;
		expect(cues[0].volume).toBeCloseTo(mapping.volume * 0.5);
	});

	it("stacks category and master volume", () => {
		setCategoryVolume("sfx_harvest", 0.8);
		setMasterVolume(0.5);
		const cues = getSoundCues("harvest_start", null, 0);
		const mapping = getActionMapping("harvest_start")!;
		expect(cues[0].volume).toBeCloseTo(mapping.volume * 0.8 * 0.5);
	});

	it("clamps category volume to 0-1", () => {
		setCategoryVolume("sfx_ui", 2.0);
		expect(getCategoryVolume("sfx_ui")).toBe(1.0);

		setCategoryVolume("sfx_ui", -0.5);
		expect(getCategoryVolume("sfx_ui")).toBe(0);
	});

	it("clamps master volume to 0-1", () => {
		setMasterVolume(1.5);
		expect(getMasterVolume()).toBe(1.0);

		setMasterVolume(-1);
		expect(getMasterVolume()).toBe(0);
	});

	it("default category volume is 1.0", () => {
		expect(getCategoryVolume("sfx_combat")).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Action queries
// ---------------------------------------------------------------------------

describe("action queries", () => {
	it("getAllActions returns all registered actions", () => {
		const actions = getAllActions();
		expect(actions.length).toBeGreaterThan(30);
		expect(actions).toContain("harvest_start");
		expect(actions).toContain("cube_grab");
		expect(actions).toContain("weapon_fire");
	});

	it("getActionsByCategory filters correctly", () => {
		const harvestActions = getActionsByCategory("sfx_harvest");
		expect(harvestActions).toContain("harvest_start");
		expect(harvestActions).toContain("harvest_loop");
		expect(harvestActions).not.toContain("cube_grab");
	});

	it("getActionsByCategory returns empty for category with no actions", () => {
		const musicActions = getActionsByCategory("music");
		expect(musicActions).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears cooldowns", () => {
		getSoundCues("cube_grab", null, 0);
		const blocked = getSoundCues("cube_grab", null, 0.05);
		expect(blocked).toHaveLength(0);

		reset();
		const afterReset = getSoundCues("cube_grab", null, 0.05);
		expect(afterReset.length).toBeGreaterThan(0);
	});

	it("resets category volumes", () => {
		setCategoryVolume("sfx_ui", 0.1);
		reset();
		expect(getCategoryVolume("sfx_ui")).toBe(1.0);
	});

	it("resets master volume", () => {
		setMasterVolume(0.3);
		reset();
		expect(getMasterVolume()).toBe(1.0);
	});
});
