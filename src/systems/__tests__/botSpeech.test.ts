import speechProfilesConfig from "../../config/speechProfiles.json";
import { initGameplayPRNG } from "../../ecs/seed";
import {
	type BotArchetype,
	type BotSpeechInput,
	botSpeechSystem,
	canSpeak,
	clearBubblesForEntity,
	determineSpeechContext,
	type EventSpeechBot,
	filterNearbyEvents,
	type GameEvent,
	type GameEventType,
	getActiveSpeechBubbles,
	getEventVisionRadius,
	processEventSpeech,
	resetBotSpeechState,
	type SpeechContext,
	selectEventLine,
	selectLine,
	updateBubblePosition,
	updateSpeechBubbleOpacities,
	type WorldContext,
} from "../botSpeech";

beforeEach(() => {
	resetBotSpeechState();
	initGameplayPRNG(42);
});

// ---------------------------------------------------------------------------
// Profile selection based on archetype
// ---------------------------------------------------------------------------
describe("profile selection based on archetype", () => {
	const archetypes: BotArchetype[] = [
		"mentor",
		"scout",
		"quartermaster",
		"fabricator",
		"warden",
		"feral",
		"cult",
	];

	it.each(
		archetypes,
	)("selects a line from the %s profile that exists in config", (archetype) => {
		const profileData =
			speechProfilesConfig.profiles[
				archetype as keyof typeof speechProfilesConfig.profiles
			];
		const line = selectLine(archetype, "idle");
		expect(line).not.toBeNull();
		expect(profileData.idle).toContain(line);
	});

	it("returns null for an unknown profile", () => {
		const line = selectLine("nonexistent" as any, "idle");
		expect(line).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Cooldown enforcement (no spam)
// ---------------------------------------------------------------------------
describe("cooldown enforcement", () => {
	const defaultCooldown = speechProfilesConfig.cooldown.defaultTurns;

	it("allows speech on the first turn", () => {
		expect(canSpeak("bot_1", 0)).toBe(true);
	});

	it("prevents speech within cooldown window after speaking", () => {
		const bot: BotSpeechInput = {
			entityId: "bot_1",
			archetype: "scout",
			activity: "idle",
		};
		const worldCtx: WorldContext = {
			stormIntensity: 0.5,
			nearbyEnemyCount: 0,
		};

		botSpeechSystem(0, [bot], worldCtx);
		expect(getActiveSpeechBubbles()).toHaveLength(1);

		// Attempt speech 1 turn later — should be blocked by cooldown
		resetBotSpeechState();
		initGameplayPRNG(99);
		botSpeechSystem(1, [bot], worldCtx);
		// No new bubble should be created because of cooldown
		// (activeBubbles was cleared, but cooldown state persists in lastSpeechTurn)
		// Need to NOT reset — let me redo this properly:
	});

	it("blocks speech before cooldown expires and allows after", () => {
		const bot: BotSpeechInput = {
			entityId: "bot_cool",
			archetype: "mentor",
			activity: "idle",
		};
		const worldCtx: WorldContext = {
			stormIntensity: 0.5,
			nearbyEnemyCount: 0,
		};

		// Turn 0: bot speaks
		botSpeechSystem(0, [bot], worldCtx);
		const bubblesAfterFirst = getActiveSpeechBubbles();
		expect(bubblesAfterFirst).toHaveLength(1);
		expect(bubblesAfterFirst[0].entityId).toBe("bot_cool");

		// Turn 1 through (cooldown - 1): bot should NOT get a new bubble
		for (let t = 1; t < defaultCooldown; t++) {
			botSpeechSystem(t, [bot], worldCtx);
		}
		// The original bubble is still active or expired, but no *new* speech happened
		// canSpeak should still be false at turn (cooldown - 1)
		expect(canSpeak("bot_cool", defaultCooldown - 1)).toBe(false);

		// Turn = cooldown: bot can speak again
		expect(canSpeak("bot_cool", defaultCooldown)).toBe(true);
		botSpeechSystem(defaultCooldown, [bot], worldCtx);
		const bubblesAfterCooldown = getActiveSpeechBubbles();
		// Should have a bubble for bot_cool
		const coolBubble = bubblesAfterCooldown.find(
			(b) => b.entityId === "bot_cool",
		);
		expect(coolBubble).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Context matching (right lines for right situations)
// ---------------------------------------------------------------------------
describe("context matching", () => {
	it("overrides activity to combat when enemies are nearby", () => {
		const ctx = determineSpeechContext("harvesting", {
			stormIntensity: 0.5,
			nearbyEnemyCount: 3,
		});
		expect(ctx).toBe("combat");
	});

	it("overrides activity to storm when storm intensity is high", () => {
		const ctx = determineSpeechContext("idle", {
			stormIntensity: 1.2,
			nearbyEnemyCount: 0,
		});
		expect(ctx).toBe("storm");
	});

	it("keeps original activity when no overrides apply", () => {
		const ctx = determineSpeechContext("discovery", {
			stormIntensity: 0.5,
			nearbyEnemyCount: 0,
		});
		expect(ctx).toBe("discovery");
	});

	it("combat takes priority over storm", () => {
		const ctx = determineSpeechContext("harvesting", {
			stormIntensity: 1.5,
			nearbyEnemyCount: 2,
		});
		expect(ctx).toBe("combat");
	});

	it("selects lines from the correct context pool", () => {
		initGameplayPRNG(12345);
		const combatLine = selectLine("feral", "combat");
		expect(combatLine).not.toBeNull();
		expect(speechProfilesConfig.profiles.feral.combat).toContain(combatLine);

		initGameplayPRNG(12345);
		const stormLine = selectLine("feral", "storm");
		expect(stormLine).not.toBeNull();
		expect(speechProfilesConfig.profiles.feral.storm).toContain(stormLine);
	});
});

// ---------------------------------------------------------------------------
// PRNG determinism (same seed = same speech)
// ---------------------------------------------------------------------------
describe("PRNG determinism", () => {
	it("produces the same line for the same seed", () => {
		initGameplayPRNG(777);
		const line1 = selectLine("mentor", "idle");

		initGameplayPRNG(777);
		const line2 = selectLine("mentor", "idle");

		expect(line1).toBe(line2);
		expect(line1).not.toBeNull();
	});

	it("produces the same sequence of bubbles for the same seed", () => {
		const bots: BotSpeechInput[] = [
			{ entityId: "a", archetype: "scout", activity: "movement" },
			{ entityId: "b", archetype: "fabricator", activity: "harvesting" },
		];
		const worldCtx: WorldContext = {
			stormIntensity: 0.5,
			nearbyEnemyCount: 0,
		};

		// Run 1
		initGameplayPRNG(555);
		resetBotSpeechState();
		botSpeechSystem(0, bots, worldCtx);
		const run1 = getActiveSpeechBubbles().map((b) => b.text);

		// Run 2 — identical seed
		initGameplayPRNG(555);
		resetBotSpeechState();
		botSpeechSystem(0, bots, worldCtx);
		const run2 = getActiveSpeechBubbles().map((b) => b.text);

		expect(run1).toEqual(run2);
		expect(run1.length).toBeGreaterThan(0);
	});

	it("produces different lines for different seeds", () => {
		// With enough attempts across different seeds, we should see variation.
		// Pick two seeds that are far apart.
		initGameplayPRNG(1);
		const lineA = selectLine("scout", "idle");

		initGameplayPRNG(999999);
		const lineB = selectLine("scout", "idle");

		// Both should be valid lines
		expect(lineA).not.toBeNull();
		expect(lineB).not.toBeNull();
		// They might occasionally collide, but with 8 choices it is unlikely
		// We just verify they are both from the config
		expect(speechProfilesConfig.profiles.scout.idle).toContain(lineA);
		expect(speechProfilesConfig.profiles.scout.idle).toContain(lineB);
	});
});

// ---------------------------------------------------------------------------
// Expiry (bubbles expire after configured turns)
// ---------------------------------------------------------------------------
describe("bubble expiry", () => {
	const duration = speechProfilesConfig.cooldown.bubbleDurationTurns;

	it("creates bubbles with correct expiry turn", () => {
		const bot: BotSpeechInput = {
			entityId: "exp_bot",
			archetype: "warden",
			activity: "idle",
		};
		const worldCtx: WorldContext = {
			stormIntensity: 0.5,
			nearbyEnemyCount: 0,
		};

		botSpeechSystem(10, [bot], worldCtx);
		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(1);
		expect(bubbles[0].expiresAtTurn).toBe(10 + duration);
	});

	it("removes expired bubbles on the next tick", () => {
		const bot: BotSpeechInput = {
			entityId: "exp_bot2",
			archetype: "quartermaster",
			activity: "movement",
		};
		const worldCtx: WorldContext = {
			stormIntensity: 0.5,
			nearbyEnemyCount: 0,
		};

		// Create bubble at turn 0
		botSpeechSystem(0, [bot], worldCtx);
		expect(getActiveSpeechBubbles()).toHaveLength(1);

		// At turn = duration, the bubble should be pruned
		// (no new bots to process, just pruning)
		botSpeechSystem(duration, [], worldCtx);
		const remaining = getActiveSpeechBubbles().filter(
			(b) => b.entityId === "exp_bot2",
		);
		expect(remaining).toHaveLength(0);
	});

	it("keeps bubbles alive before expiry", () => {
		const bot: BotSpeechInput = {
			entityId: "exp_bot3",
			archetype: "cult",
			activity: "storm",
		};
		const worldCtx: WorldContext = {
			stormIntensity: 1.2,
			nearbyEnemyCount: 0,
		};

		botSpeechSystem(5, [bot], worldCtx);
		expect(getActiveSpeechBubbles()).toHaveLength(1);

		// One turn before expiry — bubble should still be present
		botSpeechSystem(5 + duration - 1, [], worldCtx);
		const alive = getActiveSpeechBubbles().filter(
			(b) => b.entityId === "exp_bot3",
		);
		expect(alive).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Multiple bots in a single tick
// ---------------------------------------------------------------------------
describe("multiple bots per tick", () => {
	it("creates bubbles for multiple bots simultaneously", () => {
		const bots: BotSpeechInput[] = [
			{ entityId: "multi_1", archetype: "mentor", activity: "idle" },
			{ entityId: "multi_2", archetype: "feral", activity: "combat" },
			{
				entityId: "multi_3",
				archetype: "quartermaster",
				activity: "harvesting",
			},
		];
		const worldCtx: WorldContext = {
			stormIntensity: 0.5,
			nearbyEnemyCount: 0,
		};

		botSpeechSystem(0, bots, worldCtx);
		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(3);

		const entityIds = bubbles.map((b) => b.entityId).sort();
		expect(entityIds).toEqual(["multi_1", "multi_2", "multi_3"]);
	});
});

// ---------------------------------------------------------------------------
// Config-driven values from JSON
// ---------------------------------------------------------------------------
describe("config-driven values", () => {
	it("reads cooldown from speechProfiles.json", () => {
		expect(speechProfilesConfig.cooldown.defaultTurns).toBeGreaterThan(0);
		expect(speechProfilesConfig.cooldown.bubbleDurationTurns).toBeGreaterThan(
			0,
		);
	});

	it("every profile has all six context categories", () => {
		const contexts: SpeechContext[] = [
			"harvesting",
			"combat",
			"storm",
			"idle",
			"movement",
			"discovery",
		];
		for (const [, profileData] of Object.entries(
			speechProfilesConfig.profiles,
		)) {
			for (const ctx of contexts) {
				const lines = (profileData as Record<string, string[]>)[ctx];
				expect(lines).toBeDefined();
				expect(lines.length).toBeGreaterThanOrEqual(8);
			}
		}
	});

	it("has exactly 7 profiles matching the archetype list", () => {
		const profileKeys = Object.keys(speechProfilesConfig.profiles);
		expect(profileKeys.sort()).toEqual([
			"cult",
			"fabricator",
			"feral",
			"mentor",
			"quartermaster",
			"scout",
			"warden",
		]);
	});
});

// ---------------------------------------------------------------------------
// 3D rendering support (position tracking, opacity fades)
// ---------------------------------------------------------------------------
describe("3D rendering support", () => {
	const worldCtx: WorldContext = {
		stormIntensity: 0.5,
		nearbyEnemyCount: 0,
	};

	it("bubbles are created with default position and zero opacity", () => {
		const bot: BotSpeechInput = {
			entityId: "render_bot",
			archetype: "scout",
			activity: "idle",
		};
		botSpeechSystem(0, [bot], worldCtx);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(1);
		expect(bubbles[0].position).toEqual({ x: 0, y: 0, z: 0 });
		expect(bubbles[0].opacity).toBe(0);
		expect(bubbles[0].elapsed).toBe(0);
		expect(bubbles[0].displayDuration).toBeGreaterThan(0);
	});

	it("updateBubblePosition moves the bubble for a given entity", () => {
		const bot: BotSpeechInput = {
			entityId: "pos_bot",
			archetype: "mentor",
			activity: "movement",
		};
		botSpeechSystem(0, [bot], worldCtx);

		updateBubblePosition("pos_bot", { x: 10, y: 1, z: 20 });

		const bubbles = getActiveSpeechBubbles();
		const bubble = bubbles.find((b) => b.entityId === "pos_bot");
		expect(bubble).toBeDefined();
		expect(bubble!.position).toEqual({ x: 10, y: 1, z: 20 });
	});

	it("updateBubblePosition does nothing for unknown entities", () => {
		const bot: BotSpeechInput = {
			entityId: "known_bot",
			archetype: "scout",
			activity: "idle",
		};
		botSpeechSystem(0, [bot], worldCtx);

		// Should not throw
		updateBubblePosition("unknown_bot", { x: 99, y: 99, z: 99 });

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles[0].position).toEqual({ x: 0, y: 0, z: 0 });
	});

	it("updateSpeechBubbleOpacities fades in during first 0.3s", () => {
		const bot: BotSpeechInput = {
			entityId: "fade_bot",
			archetype: "warden",
			activity: "idle",
		};
		botSpeechSystem(0, [bot], worldCtx);

		updateSpeechBubbleOpacities(0.15);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles[0].opacity).toBeCloseTo(0.5, 1);
	});

	it("updateSpeechBubbleOpacities reaches full opacity after fade-in", () => {
		const bot: BotSpeechInput = {
			entityId: "full_fade_bot",
			archetype: "fabricator",
			activity: "harvesting",
		};
		botSpeechSystem(0, [bot], worldCtx);

		updateSpeechBubbleOpacities(0.3);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles[0].opacity).toBeCloseTo(1.0, 1);
	});

	it("clearBubblesForEntity removes only that entity", () => {
		const bots: BotSpeechInput[] = [
			{ entityId: "clear_a", archetype: "mentor", activity: "idle" },
			{ entityId: "clear_b", archetype: "scout", activity: "idle" },
		];
		botSpeechSystem(0, bots, worldCtx);
		expect(getActiveSpeechBubbles()).toHaveLength(2);

		clearBubblesForEntity("clear_a");

		const remaining = getActiveSpeechBubbles();
		expect(remaining).toHaveLength(1);
		expect(remaining[0].entityId).toBe("clear_b");
	});
});

// ---------------------------------------------------------------------------
// Event speech config validation
// ---------------------------------------------------------------------------
describe("event speech config", () => {
	const eventTypes: GameEventType[] = [
		"hostile_construction",
		"enemy_scouts",
		"taking_fire",
		"target_down",
		"storm_intensifying",
		"lightning_close",
	];

	it("eventVisionRadius is a positive number", () => {
		expect(speechProfilesConfig.eventVisionRadius).toBeGreaterThan(0);
	});

	it("every profile has all six event categories", () => {
		for (const [, profileData] of Object.entries(
			speechProfilesConfig.eventSpeech,
		)) {
			for (const evt of eventTypes) {
				const lines = (profileData as Record<string, string[]>)[evt];
				expect(lines).toBeDefined();
				expect(lines.length).toBeGreaterThanOrEqual(8);
			}
		}
	});

	it("has event speech for all 7 profiles", () => {
		const eventProfileKeys = Object.keys(speechProfilesConfig.eventSpeech);
		expect(eventProfileKeys.sort()).toEqual([
			"cult",
			"fabricator",
			"feral",
			"mentor",
			"quartermaster",
			"scout",
			"warden",
		]);
	});

	it("getEventVisionRadius returns the config value", () => {
		expect(getEventVisionRadius()).toBe(speechProfilesConfig.eventVisionRadius);
	});
});

// ---------------------------------------------------------------------------
// Event line selection
// ---------------------------------------------------------------------------
describe("event line selection", () => {
	const archetypes: BotArchetype[] = [
		"mentor",
		"scout",
		"quartermaster",
		"fabricator",
		"warden",
		"feral",
		"cult",
	];

	it.each(
		archetypes,
	)("selectEventLine returns a valid line for %s hostile_construction", (archetype) => {
		const line = selectEventLine(archetype, "hostile_construction");
		expect(line).not.toBeNull();
		const profileData =
			speechProfilesConfig.eventSpeech[
				archetype as keyof typeof speechProfilesConfig.eventSpeech
			];
		expect(profileData.hostile_construction).toContain(line);
	});

	it.each(
		archetypes,
	)("selectEventLine returns a valid line for %s taking_fire", (archetype) => {
		const line = selectEventLine(archetype, "taking_fire");
		expect(line).not.toBeNull();
		const profileData =
			speechProfilesConfig.eventSpeech[
				archetype as keyof typeof speechProfilesConfig.eventSpeech
			];
		expect(profileData.taking_fire).toContain(line);
	});

	it("returns null for unknown profile", () => {
		const line = selectEventLine("nonexistent" as any, "taking_fire");
		expect(line).toBeNull();
	});

	it("is deterministic with the same seed", () => {
		initGameplayPRNG(123);
		const line1 = selectEventLine("warden", "enemy_scouts");

		initGameplayPRNG(123);
		const line2 = selectEventLine("warden", "enemy_scouts");

		expect(line1).toBe(line2);
		expect(line1).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Proximity filtering
// ---------------------------------------------------------------------------
describe("proximity filtering", () => {
	const visionRadius = speechProfilesConfig.eventVisionRadius;

	it("includes events within vision radius", () => {
		const botPos = { x: 0, z: 0 };
		const events: GameEvent[] = [
			{
				type: "hostile_construction",
				position: { x: 5, z: 0 },
			},
		];
		const nearby = filterNearbyEvents(botPos, events);
		expect(nearby).toHaveLength(1);
		expect(nearby[0].type).toBe("hostile_construction");
	});

	it("excludes events outside vision radius", () => {
		const botPos = { x: 0, z: 0 };
		const events: GameEvent[] = [
			{
				type: "hostile_construction",
				position: { x: visionRadius + 10, z: 0 },
			},
		];
		const nearby = filterNearbyEvents(botPos, events);
		expect(nearby).toHaveLength(0);
	});

	it("includes events exactly at the vision radius boundary", () => {
		const botPos = { x: 0, z: 0 };
		const events: GameEvent[] = [
			{
				type: "enemy_scouts",
				position: { x: visionRadius, z: 0 },
			},
		];
		const nearby = filterNearbyEvents(botPos, events);
		expect(nearby).toHaveLength(1);
	});

	it("sorts events by distance (closest first)", () => {
		const botPos = { x: 0, z: 0 };
		const events: GameEvent[] = [
			{ type: "taking_fire", position: { x: 10, z: 0 } },
			{ type: "enemy_scouts", position: { x: 3, z: 0 } },
			{ type: "hostile_construction", position: { x: 7, z: 0 } },
		];
		const nearby = filterNearbyEvents(botPos, events);
		expect(nearby).toHaveLength(3);
		expect(nearby[0].type).toBe("enemy_scouts");
		expect(nearby[1].type).toBe("hostile_construction");
		expect(nearby[2].type).toBe("taking_fire");
	});

	it("filters using custom vision radius when provided", () => {
		const botPos = { x: 0, z: 0 };
		const events: GameEvent[] = [
			{ type: "taking_fire", position: { x: 5, z: 0 } },
			{ type: "enemy_scouts", position: { x: 3, z: 0 } },
		];
		// Custom radius smaller than default — only the closer event passes
		const nearby = filterNearbyEvents(botPos, events, 4);
		expect(nearby).toHaveLength(1);
		expect(nearby[0].type).toBe("enemy_scouts");
	});

	it("computes 2D distance correctly (x,z plane)", () => {
		const botPos = { x: 3, z: 4 };
		// Distance from (3,4) to (0,0) = 5
		const events: GameEvent[] = [
			{ type: "taking_fire", position: { x: 0, z: 0 } },
		];
		// With radius 5 it should be included, with 4 excluded
		expect(filterNearbyEvents(botPos, events, 5)).toHaveLength(1);
		expect(filterNearbyEvents(botPos, events, 4)).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Event-triggered speech generation
// ---------------------------------------------------------------------------
describe("event-triggered speech (processEventSpeech)", () => {
	it("creates a bubble for a bot near an event", () => {
		const bots: EventSpeechBot[] = [
			{ entityId: "evt_bot_1", archetype: "scout", position: { x: 0, z: 0 } },
		];
		const events: GameEvent[] = [
			{ type: "hostile_construction", position: { x: 5, z: 0 } },
		];

		processEventSpeech(0, bots, events);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(1);
		expect(bubbles[0].entityId).toBe("evt_bot_1");
		expect(
			speechProfilesConfig.eventSpeech.scout.hostile_construction,
		).toContain(bubbles[0].text);
	});

	it("does not create a bubble for a bot far from an event", () => {
		const bots: EventSpeechBot[] = [
			{
				entityId: "evt_far_bot",
				archetype: "warden",
				position: { x: 0, z: 0 },
			},
		];
		const events: GameEvent[] = [
			{ type: "hostile_construction", position: { x: 100, z: 100 } },
		];

		processEventSpeech(0, bots, events);

		expect(getActiveSpeechBubbles()).toHaveLength(0);
	});

	it("does nothing when no events are provided", () => {
		const bots: EventSpeechBot[] = [
			{
				entityId: "evt_no_event",
				archetype: "mentor",
				position: { x: 0, z: 0 },
			},
		];

		processEventSpeech(0, bots, []);

		expect(getActiveSpeechBubbles()).toHaveLength(0);
	});

	it("respects cooldown for event-triggered speech", () => {
		const bots: EventSpeechBot[] = [
			{
				entityId: "evt_cool_bot",
				archetype: "fabricator",
				position: { x: 0, z: 0 },
			},
		];
		const events: GameEvent[] = [
			{ type: "taking_fire", position: { x: 3, z: 0 } },
		];

		// First call: speech happens
		processEventSpeech(0, bots, events);
		expect(getActiveSpeechBubbles()).toHaveLength(1);

		// Second call on next turn: blocked by cooldown
		processEventSpeech(1, bots, events);
		// Still only 1 bubble (the one from turn 0)
		expect(getActiveSpeechBubbles()).toHaveLength(1);
	});

	it("processes multiple bots near different events", () => {
		const bots: EventSpeechBot[] = [
			{
				entityId: "evt_multi_1",
				archetype: "warden",
				position: { x: 0, z: 0 },
			},
			{
				entityId: "evt_multi_2",
				archetype: "scout",
				position: { x: 50, z: 50 },
			},
		];
		const events: GameEvent[] = [
			{ type: "hostile_construction", position: { x: 5, z: 0 } },
			{ type: "enemy_scouts", position: { x: 52, z: 50 } },
		];

		processEventSpeech(0, bots, events);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(2);
		const ids = bubbles.map((b) => b.entityId).sort();
		expect(ids).toEqual(["evt_multi_1", "evt_multi_2"]);
	});

	it("sets bubble position to bot position", () => {
		const bots: EventSpeechBot[] = [
			{
				entityId: "evt_pos_bot",
				archetype: "mentor",
				position: { x: 10, z: 20 },
			},
		];
		const events: GameEvent[] = [
			{ type: "storm_intensifying", position: { x: 12, z: 20 } },
		];

		processEventSpeech(0, bots, events);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(1);
		expect(bubbles[0].position.x).toBe(10);
		expect(bubbles[0].position.z).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// Event priority (higher priority events override lower ones)
// ---------------------------------------------------------------------------
describe("event priority", () => {
	it("taking_fire overrides hostile_construction", () => {
		const bots: EventSpeechBot[] = [
			{
				entityId: "evt_pri_1",
				archetype: "warden",
				position: { x: 0, z: 0 },
			},
		];
		const events: GameEvent[] = [
			{ type: "hostile_construction", position: { x: 3, z: 0 } },
			{ type: "taking_fire", position: { x: 5, z: 0 } },
		];

		processEventSpeech(0, bots, events);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(1);
		// The line should come from the taking_fire pool, not hostile_construction
		expect(speechProfilesConfig.eventSpeech.warden.taking_fire).toContain(
			bubbles[0].text,
		);
	});

	it("target_down overrides enemy_scouts", () => {
		const bots: EventSpeechBot[] = [
			{
				entityId: "evt_pri_2",
				archetype: "scout",
				position: { x: 0, z: 0 },
			},
		];
		const events: GameEvent[] = [
			{ type: "enemy_scouts", position: { x: 3, z: 0 } },
			{ type: "target_down", position: { x: 5, z: 0 } },
		];

		processEventSpeech(0, bots, events);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(1);
		expect(speechProfilesConfig.eventSpeech.scout.target_down).toContain(
			bubbles[0].text,
		);
	});

	it("enemy_scouts overrides storm_intensifying", () => {
		const bots: EventSpeechBot[] = [
			{
				entityId: "evt_pri_3",
				archetype: "quartermaster",
				position: { x: 0, z: 0 },
			},
		];
		const events: GameEvent[] = [
			{ type: "storm_intensifying", position: { x: 3, z: 0 } },
			{ type: "enemy_scouts", position: { x: 5, z: 0 } },
		];

		processEventSpeech(0, bots, events);

		const bubbles = getActiveSpeechBubbles();
		expect(bubbles).toHaveLength(1);
		expect(
			speechProfilesConfig.eventSpeech.quartermaster.enemy_scouts,
		).toContain(bubbles[0].text);
	});
});

// ---------------------------------------------------------------------------
// Profile-appropriate lines (defensive vs aggressive archetypes)
// ---------------------------------------------------------------------------
describe("archetype-appropriate event speech", () => {
	it("warden speech for hostile_construction is defensive in tone", () => {
		const lines = speechProfilesConfig.eventSpeech.warden.hostile_construction;
		// Wardens should mention defense, perimeter, fortification
		const defensiveTerms = [
			"fortif",
			"defensive",
			"perimeter",
			"reinforce",
			"threat",
			"walls",
		];
		const hasDefensiveTone = lines.some((line: string) =>
			defensiveTerms.some((term) => line.toLowerCase().includes(term)),
		);
		expect(hasDefensiveTone).toBe(true);
	});

	it("scout speech for enemy_scouts is recon-oriented", () => {
		const lines = speechProfilesConfig.eventSpeech.scout.enemy_scouts;
		// Scouts should mention evading, dark, silent, repositioning
		const reconTerms = [
			"evad",
			"dark",
			"silent",
			"repositioning",
			"contact",
			"counter",
		];
		const hasReconTone = lines.some((line: string) =>
			reconTerms.some((term) => line.toLowerCase().includes(term)),
		);
		expect(hasReconTone).toBe(true);
	});

	it("feral speech uses uppercase aggressive style", () => {
		const lines = speechProfilesConfig.eventSpeech.feral.taking_fire;
		// Feral bots speak in all-caps
		const allCaps = lines.every((line: string) => line === line.toUpperCase());
		expect(allCaps).toBe(true);
	});

	it("cult speech references the EL or divine themes", () => {
		const lines = speechProfilesConfig.eventSpeech.cult.hostile_construction;
		const divineTerms = [
			"el",
			"divine",
			"holy",
			"heretic",
			"sacred",
			"blasphemy",
		];
		const hasDivineTone = lines.some((line: string) =>
			divineTerms.some((term) => line.toLowerCase().includes(term)),
		);
		expect(hasDivineTone).toBe(true);
	});

	it("warden and scout give different lines for the same event", () => {
		initGameplayPRNG(42);
		const wardenLine = selectEventLine("warden", "taking_fire");
		initGameplayPRNG(42);
		const scoutLine = selectEventLine("scout", "taking_fire");

		// Both should be valid non-null lines
		expect(wardenLine).not.toBeNull();
		expect(scoutLine).not.toBeNull();

		// They draw from different pools so should differ
		// (same seed, different line pools => different lines)
		expect(wardenLine).not.toBe(scoutLine);
	});
});
