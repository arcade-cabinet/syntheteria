/**
 * @package views
 *
 * Unified rendering package:
 *   - views/title/ — R3F title + generating globe (TSX)
 *   - views/board/ — Phaser + enable3d playing board (pure TS)
 *
 * Consumers import from "../views" (or "../views/title" / "../views/board"
 * for sub-package-specific imports).
 */

// ─── Board (Phaser + enable3d) ──────────────────────────────────────────────

export type { GameBoardConfig } from "./board/createGame";
export { createGame } from "./board/createGame";
export { EventBus } from "./board/eventBus";
// Lighting
export {
	applyEpochAtmosphere,
	getCurrentAtmosphereEpoch,
	getEpochAtmosphereParams,
	resetEpochAtmosphere,
} from "./board/lighting/epochAtmosphere";
export {
	addAccentLight,
	setupWorldLighting,
} from "./board/lighting/worldLighting";
// Roboform overlay
export type { RoboformTile } from "./board/renderers/roboformOverlay";
export {
	clearRoboformData,
	createRoboformOverlay,
	destroyRoboformOverlay,
	getRoboformLevel,
	getRoboformSnapshot,
	setRoboformLevel,
	updateRoboformOverlay,
} from "./board/renderers/roboformOverlay";
export { WorldScene } from "./board/scenes/WorldScene";

// ─── Title (R3F) ────────────────────────────────────────────────────────────
// Re-exported so consumers can use `from "../views"` for everything,
// or `from "../views/title"` for title-specific imports.

export {
	// Renderers
	BiomeRenderer,
	BoardRenderer,
	BuildingRenderer,
	// Effects
	CombatEffectsRenderer,
	CultDomeRenderer,
	CutawayClipPlane,
	clearPreviewPath,
	// Overlays
	FogOfWarRenderer,
	FragmentRenderer,
	// Globe
	GlobeWithCities,
	HighlightRenderer,
	Hypercane,
	IlluminatorRenderer,
	InfrastructureRenderer,
	LightningEffect,
	LodGlobe,
	// Shared
	ModelErrorBoundary,
	ParticleRenderer,
	PathRenderer,
	SalvageRenderer,
	SpeechBubbleRenderer,
	StormClouds,
	StormSky,
	StructureRenderer,
	setPreviewPath,
	TerritoryOverlayRenderer,
	TitleText,
	UnifiedTerrainRenderer,
	UnitRenderer,
	UnitStatusBars,
} from "./title";
