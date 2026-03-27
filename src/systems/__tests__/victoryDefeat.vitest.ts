/**
 * Tests for victory/defeat system.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	getGameOutcome,
	recordCultLeaderKill,
	resetOutcome,
	victoryDefeatSystem,
} from "../victoryDefeat";

beforeEach(() => {
	resetOutcome();
});

describe("victory", () => {
	it("starts as playing", () => {
		expect(getGameOutcome()).toBe("playing");
	});

	it("records cult leader kill as victory", () => {
		recordCultLeaderKill();
		expect(getGameOutcome()).toBe("victory");
	});

	it("victory is permanent", () => {
		recordCultLeaderKill();
		expect(getGameOutcome()).toBe("victory");
		// Running the system again doesn't change outcome
		victoryDefeatSystem();
		expect(getGameOutcome()).toBe("victory");
	});
});

describe("defeat", () => {
	it("defeat triggers when no player units exist after grace period", () => {
		// System needs multiple ticks of zero player units
		for (let i = 0; i < 10; i++) {
			victoryDefeatSystem();
		}
		expect(getGameOutcome()).toBe("defeat");
	});

	it("defeat is permanent", () => {
		for (let i = 0; i < 10; i++) {
			victoryDefeatSystem();
		}
		expect(getGameOutcome()).toBe("defeat");
		victoryDefeatSystem();
		expect(getGameOutcome()).toBe("defeat");
	});
});

describe("reset", () => {
	it("resets outcome to playing", () => {
		recordCultLeaderKill();
		expect(getGameOutcome()).toBe("victory");
		resetOutcome();
		expect(getGameOutcome()).toBe("playing");
	});
});
