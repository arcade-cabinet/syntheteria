// ─── View Package ─────────────────────────────────────────────────────────────
// All React Three Fiber renderer components. Imports from rendering/ (pure TS)
// and traits/ (ECS queries). No logic here — just presentation.

// Renderers
export { BiomeRenderer } from "./renderers/BiomeRenderer";
export { BoardRenderer } from "./renderers/BoardRenderer";
export { BuildingRenderer } from "./renderers/BuildingRenderer";
export { CultDomeRenderer } from "./renderers/CultDomeRenderer";
export { CutawayClipPlane } from "./renderers/CutawayClipPlane";
export { FragmentRenderer } from "./renderers/FragmentRenderer";
export { IlluminatorRenderer } from "./renderers/IlluminatorRenderer";
export { InfrastructureRenderer } from "./renderers/InfrastructureRenderer";
export { LodGlobe } from "./renderers/LodGlobe";
export { SalvageRenderer } from "./renderers/SalvageRenderer";
export { StormSky } from "./renderers/StormSky";
export { StructureRenderer } from "./renderers/StructureRenderer";
export { UnifiedTerrainRenderer } from "./renderers/UnifiedTerrainRenderer";
export { UnitRenderer } from "./renderers/UnitRenderer";

// Overlays
export { FogOfWarRenderer } from "./overlays/FogOfWarRenderer";
export { HighlightRenderer } from "./overlays/HighlightRenderer";
export {
	PathRenderer,
	setPreviewPath,
	clearPreviewPath,
} from "./overlays/PathRenderer";
export { TerritoryOverlayRenderer } from "./overlays/TerritoryOverlayRenderer";

// Effects
export { CombatEffectsRenderer } from "./effects/CombatEffectsRenderer";
export { ParticleRenderer } from "./effects/ParticleRenderer";
export { SpeechBubbleRenderer } from "./effects/SpeechBubbleRenderer";

// Shared
export { ModelErrorBoundary } from "./ModelErrorBoundary";
export { UnitStatusBars } from "./UnitStatusBars";

// Globe (title scene)
export {
	GlobeWithCities,
	Hypercane,
	LightningEffect,
	StormClouds,
	TitleText,
} from "./globe";
