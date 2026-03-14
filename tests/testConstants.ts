/**
 * Shared test constants for deterministic, source-of-truth-driven tests.
 *
 * All world generation tests MUST use TEST_SEED to enable exact assertions.
 * All counts and enumerations are derived from config JSON, never hardcoded.
 */

import modelManifest from "../src/config/modelDefinitions.json";
import chunksConfig from "../src/config/chunks.json";

// ─── Deterministic Seed ─────────────────────────────────────────────────────

export const TEST_SEED = 42;
export const TEST_SEED_STRING = "syntheteria-test-deterministic-42";

// ─── Model Definitions Source of Truth ──────────────────────────────────────

export const MODEL_DEFINITIONS = modelManifest.models;
export const EXPECTED_MODEL_COUNT = modelManifest.models.length;
export const TILE_SIZE_METERS = modelManifest.tileSize;

// ─── World Grid Constants ───────────────────────────────────────────────────

export const STANDARD_MAP_WIDTH = 40;
export const STANDARD_MAP_HEIGHT = 40;

// ─── Chunk Config ───────────────────────────────────────────────────────────

export const CHUNK_SIZE = chunksConfig.chunkSize;
export const CELL_WORLD_SIZE = chunksConfig.cellWorldSize;

// ─── Valid Enumerations (derived from JSON source of truth) ─────────────────

export const VALID_CATEGORIES = [
	...new Set(modelManifest.models.map((m) => m.category)),
].sort() as string[];

export const CATEGORY_COUNTS: Record<string, number> = {};
for (const model of modelManifest.models) {
	CATEGORY_COUNTS[model.category] =
		(CATEGORY_COUNTS[model.category] ?? 0) + 1;
}

export const EXPECTED_CATEGORIES = [
	"city_kit",
	"defense",
	"exploration",
	"industrial",
	"infrastructure",
	"logistics",
	"robot",
	"structural",
] as const;

export const EXPECTED_POI_TYPES = [
	"home_base",
	"coast_mines",
	"science_campus",
	"northern_cult_site",
	"deep_sea_gateway",
] as const;

// ─── Asset Path Resolution ──────────────────────────────────────────────────

export const ASSET_BASE_PATH = "assets/models";
