/**
 * Read model definitions from SQLite for chunk generation.
 * Parses bounds_json, mechanics_json, placement_rules_json for gen-specific fields.
 */

import type { SyncDatabase } from "./types";

export interface ModelEntry {
	id: string;
	family: string;
	height: number;
	passable: boolean;
	hasHarvest: boolean;
	isBridge: boolean;
	isRamp: boolean;
	isSupport: boolean;
}

interface DbRow {
	id: string;
	family: string;
	passable: number;
	bounds_json: string;
	mechanics_json: string;
	placement_rules_json: string;
}

/**
 * Get model definitions from DB in the format chunkGen expects.
 */
export function getModelDefinitionsFromDb(db: SyncDatabase): ModelEntry[] {
	const rows = db.getAllSync<DbRow>(
		"SELECT id, family, passable, bounds_json, mechanics_json, placement_rules_json FROM model_definitions",
	);

	return rows.map((row) => {
		let height = 1;
		try {
			const bounds = JSON.parse(row.bounds_json) as {
				height?: number;
				depth?: number;
			};
			height = bounds.height ?? bounds.depth ?? 1;
		} catch {
			// keep default
		}

		let hasHarvest = false;
		try {
			const mechanics = JSON.parse(row.mechanics_json) as {
				harvest?: { yields?: unknown[] };
			};
			const yields = mechanics?.harvest?.yields;
			hasHarvest = Array.isArray(yields) && yields.length > 0;
		} catch {
			// keep false
		}

		let isBridge = false;
		let isRamp = false;
		let isSupport = false;
		try {
			const placement = JSON.parse(row.placement_rules_json) as {
				elevationProfile?: {
					supportsBridging?: boolean;
					isRamp?: boolean;
					isVerticalSupport?: boolean;
				};
			};
			const ep = placement?.elevationProfile;
			if (ep) {
				isBridge = ep.supportsBridging ?? false;
				isRamp = ep.isRamp ?? false;
				isSupport = ep.isVerticalSupport ?? false;
			}
		} catch {
			// keep false
		}

		return {
			id: row.id,
			family: row.family,
			height,
			passable: row.passable === 1,
			hasHarvest,
			isBridge,
			isRamp,
			isSupport,
		};
	});
}
