import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearAllSpeech,
	getActiveSpeech,
	getSpeechSnapshot,
	subscribeSpeech,
	triggerSpeech,
} from "../speechBubbleStore";

/**
 * speechBubbleStore uses Date.now() for cooldown/expiration timing.
 * We use vi.useFakeTimers() so we can control time precisely.
 */

describe("speechBubbleStore", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		clearAllSpeech();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ─── triggerSpeech basics ────────────────────────────────────────────

	describe("triggerSpeech", () => {
		it("adds a speech bubble for a unit", () => {
			triggerSpeech(1, "player", "Hello world");

			const active = getActiveSpeech();
			expect(active).toHaveLength(1);
			expect(active[0]!.entityId).toBe(1);
			expect(active[0]!.factionId).toBe("player");
			expect(active[0]!.text).toBe("Hello world");
		});

		it("replaces existing speech for the same entity", () => {
			triggerSpeech(1, "player", "First");
			// Advance past cooldown
			vi.advanceTimersByTime(6000);
			triggerSpeech(1, "player", "Second");

			const active = getActiveSpeech();
			expect(active).toHaveLength(1);
			expect(active[0]!.text).toBe("Second");
		});

		it("supports multiple entities speaking simultaneously", () => {
			triggerSpeech(1, "player", "Unit 1");
			triggerSpeech(2, "reclaimers", "Unit 2");
			triggerSpeech(3, "iron_creed", "Unit 3");

			expect(getActiveSpeech()).toHaveLength(3);
		});
	});

	// ─── Cooldown enforcement ───────────────────────────────────────────

	describe("cooldown enforcement", () => {
		it("silently drops speech when unit spoke too recently", () => {
			triggerSpeech(1, "player", "First");
			triggerSpeech(1, "player", "Second — should be dropped");

			const active = getActiveSpeech();
			expect(active).toHaveLength(1);
			expect(active[0]!.text).toBe("First");
		});

		it("allows speech after cooldown period expires", () => {
			triggerSpeech(1, "player", "First");
			// SPEECH_COOLDOWN_TURNS=5, 5*1000=5000ms
			vi.advanceTimersByTime(5000);
			triggerSpeech(1, "player", "After cooldown");

			const active = getActiveSpeech();
			// First may have expired (duration=3000ms < cooldown=5000ms), so only "After cooldown" remains
			const latest = active.find((s) => s.text === "After cooldown");
			expect(latest).toBeDefined();
		});

		it("cooldown is per-entity — different entities are independent", () => {
			triggerSpeech(1, "player", "Unit 1");
			triggerSpeech(2, "player", "Unit 2");

			// Both should exist
			expect(getActiveSpeech()).toHaveLength(2);
		});

		it("blocks speech at cooldown-1ms, allows at exact cooldown", () => {
			triggerSpeech(1, "player", "First");

			// Just under cooldown
			vi.advanceTimersByTime(4999);
			triggerSpeech(1, "player", "Too soon");
			// First should be expired by now (3000ms duration) but "Too soon" should be blocked
			const midActive = getActiveSpeech();
			const tooSoon = midActive.find((s) => s.text === "Too soon");
			expect(tooSoon).toBeUndefined();

			// At exactly cooldown
			vi.advanceTimersByTime(1);
			triggerSpeech(1, "player", "Right on time");
			const rightOnTime = getActiveSpeech().find(
				(s) => s.text === "Right on time",
			);
			expect(rightOnTime).toBeDefined();
		});
	});

	// ─── Bubble expiration ──────────────────────────────────────────────

	describe("bubble expiration", () => {
		it("bubbles expire after BUBBLE_DURATION_MS (3000ms)", () => {
			triggerSpeech(1, "player", "Transient");
			expect(getActiveSpeech()).toHaveLength(1);

			// Advance past duration
			vi.advanceTimersByTime(3001);
			expect(getActiveSpeech()).toHaveLength(0);
		});

		it("bubbles persist until exactly BUBBLE_DURATION_MS", () => {
			triggerSpeech(1, "player", "Still here");
			vi.advanceTimersByTime(3000);
			// At exactly 3000ms, bubble should still be there (> check, not >=)
			expect(getActiveSpeech()).toHaveLength(1);
		});

		it("expired bubbles are cleaned up by getActiveSpeech", () => {
			triggerSpeech(1, "player", "Unit 1");
			vi.advanceTimersByTime(1000);
			triggerSpeech(2, "player", "Unit 2");

			// After 2500ms from Unit 1: Unit 1 still alive, Unit 2 alive
			vi.advanceTimersByTime(1500);
			expect(getActiveSpeech()).toHaveLength(2);

			// After 3001ms from Unit 1: Unit 1 expired, Unit 2 still alive (only 2001ms)
			vi.advanceTimersByTime(501);
			expect(getActiveSpeech()).toHaveLength(1);
			expect(getActiveSpeech()[0]!.entityId).toBe(2);
		});
	});

	// ─── clearAllSpeech ─────────────────────────────────────────────────

	describe("clearAllSpeech", () => {
		it("removes all active speech bubbles", () => {
			triggerSpeech(1, "player", "A");
			triggerSpeech(2, "reclaimers", "B");
			expect(getActiveSpeech()).toHaveLength(2);

			clearAllSpeech();
			expect(getActiveSpeech()).toHaveLength(0);
		});

		it("also clears cooldowns so units can speak again", () => {
			triggerSpeech(1, "player", "First");
			clearAllSpeech();

			// Without clearAllSpeech clearing cooldowns, this would be blocked
			triggerSpeech(1, "player", "After clear");
			expect(getActiveSpeech()).toHaveLength(1);
			expect(getActiveSpeech()[0]!.text).toBe("After clear");
		});
	});

	// ─── Subscriber notification ────────────────────────────────────────

	describe("subscribeSpeech", () => {
		it("notifies on triggerSpeech", () => {
			let notified = false;
			const unsub = subscribeSpeech(() => {
				notified = true;
			});

			triggerSpeech(1, "player", "Hello");
			expect(notified).toBe(true);

			unsub();
		});

		it("notifies on clearAllSpeech", () => {
			triggerSpeech(1, "player", "Hello");

			let notified = false;
			const unsub = subscribeSpeech(() => {
				notified = true;
			});

			clearAllSpeech();
			expect(notified).toBe(true);

			unsub();
		});

		it("unsubscribe stops future notifications", () => {
			let count = 0;
			const unsub = subscribeSpeech(() => {
				count++;
			});

			triggerSpeech(1, "player", "One");
			expect(count).toBe(1);

			unsub();
			triggerSpeech(2, "player", "Two");
			expect(count).toBe(1);
		});

		it("does not notify when speech is silently dropped by cooldown", () => {
			triggerSpeech(1, "player", "First");

			let notified = false;
			const unsub = subscribeSpeech(() => {
				notified = true;
			});

			// Should be dropped — no notification
			triggerSpeech(1, "player", "Blocked");
			expect(notified).toBe(false);

			unsub();
		});
	});

	// ─── getSpeechSnapshot ──────────────────────────────────────────────

	describe("getSpeechSnapshot", () => {
		it("returns same reference when size unchanged", () => {
			triggerSpeech(1, "player", "Test");
			const snap1 = getSpeechSnapshot();
			const snap2 = getSpeechSnapshot();
			expect(snap1).toBe(snap2);
		});

		it("returns new reference when size changes", () => {
			triggerSpeech(1, "player", "A");
			const snap1 = getSpeechSnapshot();

			triggerSpeech(2, "reclaimers", "B");
			const snap2 = getSpeechSnapshot();
			expect(snap1).not.toBe(snap2);
		});

		it("returns empty array when nothing active", () => {
			expect(getSpeechSnapshot()).toEqual([]);
		});
	});
});
