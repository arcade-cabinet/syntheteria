/**
 * Loader for unitVisuals.json — cultist identity, mark badges, damage visuals.
 * Fail-hard: throws if config is missing or invalid.
 */

// Static import so bundler includes the JSON; throws at module load if missing
import unitVisualsJson from "./unitVisuals.json";
import type { UnitVisualsConfig } from "./unitVisuals.types";

function assertUnitVisualsConfig(
	raw: unknown,
): asserts raw is UnitVisualsConfig {
	if (!raw || typeof raw !== "object") {
		throw new Error("unitVisuals.json: invalid or missing config");
	}
	const o = raw as Record<string, unknown>;
	if (!o.cultist || !o.markBadgeColors || !o.damageVisuals) {
		throw new Error(
			"unitVisuals.json: missing cultist, markBadgeColors, or damageVisuals",
		);
	}
}

assertUnitVisualsConfig(unitVisualsJson);

export const unitVisualsConfig: UnitVisualsConfig = unitVisualsJson;

/** Parse hex string from config to number (e.g. "0xff2266" -> 0xff2266) */
export function parseHexColor(hex: string): number {
	const n = parseInt(hex, 16);
	if (Number.isNaN(n)) {
		throw new Error(`unitVisuals: invalid hex color "${hex}"`);
	}
	return n;
}
