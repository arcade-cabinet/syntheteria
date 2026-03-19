import { beforeEach, describe, expect, it } from "vitest";
import { initGameplayPRNG } from "../../seed";
import {
	CONTEXT_SPEECH,
	EVENT_SPEECH,
	EVENT_VISION_RADIUS,
	PERSONA_TO_PROFILE,
	SPEECH_BUBBLE_DURATION_TURNS,
	SPEECH_COOLDOWN_TURNS,
	getContextSpeech,
	getContextSpeechByPersona,
	getEventSpeech,
	getEventSpeechByPersona,
	pickSpeechLine,
	profileForPersona,
	type ContextSpeechTrigger,
	type EventSpeechTrigger,
	type SpeechProfileId,
} from "../speechProfiles";

// Seed the PRNG for deterministic tests
beforeEach(() => {
	initGameplayPRNG(42);
});

describe("speech profile types and data", () => {
	const ALL_PROFILES: SpeechProfileId[] = [
		"mentor", "scout", "quartermaster", "fabricator", "warden", "feral", "cult",
	];
	const ALL_EVENT_TRIGGERS: EventSpeechTrigger[] = [
		"hostile_construction", "enemy_scouts", "taking_fire",
		"target_down", "storm_intensifying", "lightning_close",
	];
	const ALL_CONTEXT_TRIGGERS: ContextSpeechTrigger[] = [
		"harvesting", "combat", "storm", "idle", "movement", "discovery",
	];

	it("EVENT_SPEECH has all profiles × triggers", () => {
		for (const profile of ALL_PROFILES) {
			for (const trigger of ALL_EVENT_TRIGGERS) {
				const lines = EVENT_SPEECH[profile][trigger];
				expect(lines.length).toBeGreaterThan(0);
			}
		}
	});

	it("CONTEXT_SPEECH has all profiles × triggers", () => {
		for (const profile of ALL_PROFILES) {
			for (const trigger of ALL_CONTEXT_TRIGGERS) {
				const lines = CONTEXT_SPEECH[profile][trigger];
				expect(lines.length).toBeGreaterThan(0);
			}
		}
	});

	it("all lines are non-empty strings", () => {
		for (const profile of ALL_PROFILES) {
			for (const trigger of ALL_EVENT_TRIGGERS) {
				for (const line of EVENT_SPEECH[profile][trigger]) {
					expect(typeof line).toBe("string");
					expect(line.length).toBeGreaterThan(0);
				}
			}
			for (const trigger of ALL_CONTEXT_TRIGGERS) {
				for (const line of CONTEXT_SPEECH[profile][trigger]) {
					expect(typeof line).toBe("string");
					expect(line.length).toBeGreaterThan(0);
				}
			}
		}
	});
});

describe("configuration constants", () => {
	it("cooldown, duration, and vision radius have expected values", () => {
		expect(SPEECH_COOLDOWN_TURNS).toBe(5);
		expect(SPEECH_BUBBLE_DURATION_TURNS).toBe(3);
		expect(EVENT_VISION_RADIUS).toBe(15);
	});
});

describe("persona → profile mapping", () => {
	it("maps all 5 faction personas", () => {
		expect(PERSONA_TO_PROFILE.otter).toBe("mentor");
		expect(PERSONA_TO_PROFILE.fox).toBe("scout");
		expect(PERSONA_TO_PROFILE.raven).toBe("quartermaster");
		expect(PERSONA_TO_PROFILE.lynx).toBe("fabricator");
		expect(PERSONA_TO_PROFILE.bear).toBe("warden");
	});

	it("profileForPersona returns correct profile", () => {
		expect(profileForPersona("fox")).toBe("scout");
		expect(profileForPersona("bear")).toBe("warden");
	});

	it("profileForPersona defaults to mentor for unknown personas", () => {
		expect(profileForPersona("unknown")).toBe("mentor");
		expect(profileForPersona("")).toBe("mentor");
	});
});

describe("seeded-deterministic line selection", () => {
	it("pickSpeechLine returns a valid line from the array", () => {
		const lines = ["alpha", "beta", "gamma"];
		const result = pickSpeechLine(lines);
		expect(lines).toContain(result);
	});

	it("same seed produces same sequence", () => {
		initGameplayPRNG(999);
		const lines = EVENT_SPEECH.mentor.taking_fire;
		const first = pickSpeechLine(lines);
		const second = pickSpeechLine(lines);

		initGameplayPRNG(999);
		expect(pickSpeechLine(lines)).toBe(first);
		expect(pickSpeechLine(lines)).toBe(second);
	});

	it("different seeds produce different sequences", () => {
		const lines = EVENT_SPEECH.scout.enemy_scouts;

		initGameplayPRNG(1);
		const seq1: string[] = [];
		for (let i = 0; i < 10; i++) seq1.push(pickSpeechLine(lines));

		initGameplayPRNG(2);
		const seq2: string[] = [];
		for (let i = 0; i < 10; i++) seq2.push(pickSpeechLine(lines));

		// Sequences should differ (extremely unlikely to be identical with different seeds)
		expect(seq1.join(",")).not.toBe(seq2.join(","));
	});
});

describe("helper functions", () => {
	it("getEventSpeech returns valid line for profile + trigger", () => {
		const line = getEventSpeech("warden", "taking_fire");
		expect(EVENT_SPEECH.warden.taking_fire).toContain(line);
	});

	it("getContextSpeech returns valid line for profile + context", () => {
		const line = getContextSpeech("fabricator", "harvesting");
		expect(CONTEXT_SPEECH.fabricator.harvesting).toContain(line);
	});

	it("getEventSpeechByPersona resolves persona to profile", () => {
		const line = getEventSpeechByPersona("fox", "target_down");
		expect(EVENT_SPEECH.scout.target_down).toContain(line);
	});

	it("getContextSpeechByPersona resolves persona to profile", () => {
		const line = getContextSpeechByPersona("bear", "idle");
		expect(CONTEXT_SPEECH.warden.idle).toContain(line);
	});

	it("feral profile returns ALL-CAPS lines", () => {
		const line = getEventSpeech("feral", "taking_fire");
		expect(line).toBe(line.toUpperCase());
	});
});
