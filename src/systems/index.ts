/**
 * @package systems
 *
 * ALL Koota systems for Syntheteria — one per file, pure functions accepting `world: World`.
 */

// --- AI & Turn Flow ---
export { runAiTurns, resolveAllMoves } from "./aiTurnSystem";
export { advanceTurn, getGameOutcome, getCurrentTurn } from "./turnSystem";

// --- Analytics & Campaign Stats ---
export {
	collectCampaignStats,
	collectFactionResources,
	collectTurnSnapshot,
} from "./analyticsCollector";
export type { TurnSnapshotData, FactionResourceData } from "./analyticsCollector";
export {
	getCampaignStats,
	subscribeCampaignStats,
	recordTurnEnd,
	recordStructureHarvested,
	recordMaterialGathered,
	recordCellDiscovered,
	recordUnitBuilt,
	recordUnitLost,
	recordUnitHacked,
	recordStructureBuilt,
	recordIncursionSurvived,
	recordCultistDestroyed,
	recordBuildingDestroyed,
	recordLightningStrike,
	recordCombatEngagement,
	recordCombatKill,
	getCombatKills,
	updateTerritorySize,
	setCampaignStats,
} from "./campaignStats";
export type { CampaignStats } from "./campaignStats";

// --- Combat ---
export { resolveAttacks } from "./attackSystem";

// --- Building ---
export { placeStarterBuildings } from "./buildingPlacement";
export {
	startBuildPlacement,
	getPendingBuildType,
	isInBuildPlacementMode,
	cancelBuildPlacement,
	confirmBuildPlacement,
	_resetBuildSystem,
} from "./buildSystem";

// --- Cult ---
export {
	getStormCultistParams,
	initCultPOIs,
	getPOIPositions,
	initBreachZones,
	getEscalationStage,
	runCultPatrols,
	cleanupDestroyedStructures,
	checkCultistSpawn,
	spreadCorruption,
	getCorruptedTiles,
	getBreachZones,
	getAltarZones,
	SECT_BIASES,
	_reset as _resetCultist,
} from "./cultistSystem";
export type { StormCultistParams, SectBias, EscalationStage } from "./cultistSystem";
export {
	TIER_1_BUFFS,
	TIER_2_ABILITIES,
	tickCultMutations,
	computeTier,
	getMutationXPMultiplier,
} from "./cultMutation";

// --- Diplomacy ---
export {
	getStandingLevel,
	getStandingDisplay,
	applyDiplomacyEvent,
	getRecentDiplomacyEvents,
	subscribeDiplomacy,
	recordAggression,
	proposeAlliance,
	declareWar,
	applyBreakPenalty,
	calculateTradeIncome,
	runDiplomacy,
	shareAlliedFog,
	isAlly,
	getDiplomacyPersonality,
	_resetDiplomacy,
} from "./diplomacySystem";
export type {
	StandingLevel,
	DiplomacyEvent,
	TradeIncome,
	DiplomacyPersonality,
} from "./diplomacySystem";

// --- Experience & Upgrade ---
export {
	BASE_XP,
	OFF_ROLE_MULTIPLIER,
	CLASS_ROLE,
	ROLE_ACTIONS,
	getMarkThreshold,
	getXPForNextMark,
	isRoleAligned,
	calculateXPForAction,
	awardXP,
	applyMarkUpgrade,
	getXPProgress,
	recordKill,
	recordHarvest,
	resetAllXP,
} from "./experienceSystem";
export type { XPActionType, RobotRoleFamily } from "./experienceSystem";
export {
	getMaxTier,
	parseMarks,
	hasMark,
	applyMark,
} from "./upgradeSystem";
export type { UpgradeResult } from "./upgradeSystem";

// --- Fabrication ---
export {
	FabricationJob,
	ROBOT_COSTS,
	queueFabrication,
	runFabrication,
} from "./fabricationSystem";
export type { RobotCost, QueueResult } from "./fabricationSystem";

// --- Fog of War ---
export { revealFog } from "./fogRevealSystem";

// --- Hacking ---
export {
	HackProgress,
	startHack,
	cancelHack,
	startUnitHack,
	runHackProgress,
} from "./hackingSystem";
export type { HackType, StartHackResult, StartUnitHackResult } from "./hackingSystem";
export {
	HACKING_AP_COST,
	HACKING_RANGE,
	HACKING_BASE_DIFFICULTY,
	getHackedBotRole,
} from "./hackingTypes";
export type { HackedBotRole } from "./hackingTypes";

// --- Harvesting & Mining ---
export { harvestSystem, startHarvest } from "./harvestSystem";
export { floorMiningSystem, startFloorMining } from "./floorMiningSystem";

// --- Highlight ---
export {
	clearHighlights,
	highlightReachableTiles,
	highlightPlacementTile,
} from "./highlightSystem";

// --- Memory Fragments ---
export {
	FRAGMENT_CONFIG,
	getFragmentDefinition,
	getAllFragmentDefinitions,
	getInteractionRadius,
	getGlowColor,
	getGlowIntensity,
	subscribeMemoryFragments,
	placeFragment,
	getPlacedFragments,
	checkProximity,
	readFragment,
	isDiscovered,
	isRead,
	getFragmentProgress,
	getReadFragments,
	placeFragmentsInWorld,
	checkAllFragmentProximity,
	resetMemoryFragments,
} from "./memoryFragments";
export type { FragmentDefinition, PlacedFragment } from "./memoryFragments";

// --- Movement ---
export { movementSystem } from "./movementSystem";

// --- Population ---
export {
	BASE_POP_CAP,
	POP_PER_OUTPOST,
	POP_PER_POWER_PLANT,
	getPopulation,
	getPopCap,
	canSpawnUnit,
} from "./populationSystem";

// --- Power ---
export { runPowerGrid, isPowered } from "./powerSystem";

// --- Radial Menu ---
export {
	registerRadialProvider,
	hitTestRadial,
	getRadialMenuState,
	getResolvedActionsForCategory,
	openRadialMenu,
	updateRadialHover,
	confirmRadialSelection,
	closeRadialMenu,
	resetRadialMenu,
	getRadialGeometry,
	_reset as _resetRadial,
} from "./radialMenu";
export type {
	RadialOpenContext,
	RadialAction,
	RadialCategory,
	RadialActionProvider,
	RadialPetal,
	RadialMenuState,
} from "./radialMenu";
export {
	setBuildProviderWorld,
	setProviderSelectedUnit,
	setProviderBoard,
} from "./radialProviders";

// --- Repair ---
export { runRepairs } from "./repairSystem";

// --- Research ---
export {
	ResearchState,
	countResearchLabs,
	getResearchState,
	getAvailableTechs,
	isTechResearched,
	hasTechEffect,
	getTechEffectValue,
	queueResearch,
	cancelResearch,
	runResearch,
} from "./researchSystem";
export type { QueueResearchResult } from "./researchSystem";

// --- Resources ---
export {
	trackIncome,
	trackExpenditure,
	finalizeTurnDeltas,
	getResourceDeltas,
	subscribeResourceDeltas,
	resetResourceDeltas,
} from "./resourceDeltaSystem";
export type { ResourceDelta, ResourceDeltaMap } from "./resourceDeltaSystem";
export { RENEWAL_YIELDS, runResourceRenewal } from "./resourceRenewalSystem";
export {
	getPlayerResources,
	addResources,
	spendResources,
	canAfford,
} from "./resourceSystem";

// --- Salvage ---
export { placeSalvageProps, TERRAIN_SALVAGE } from "./salvagePlacement";

// --- Signal ---
export { isInSignalRange, runSignalNetwork } from "./signalSystem";

// --- Specialization ---
export { runSpecializationPassives } from "./specializationSystem";

// --- Speech ---
export {
	triggerSpeech,
	getActiveSpeech,
	clearAllSpeech,
	subscribeSpeech,
	getSpeechSnapshot,
} from "./speechBubbleStore";
export type { ActiveSpeech } from "./speechBubbleStore";
export {
	triggerCombatSpeech,
	triggerHarvestSpeech,
	triggerDiscoverySpeech,
	triggerEventSpeech,
	triggerContextSpeech,
} from "./speechTriggers";

// --- Synthesis ---
export {
	FUSION_RECIPES,
	SynthesisQueue,
	queueSynthesis,
	runSynthesis,
} from "./synthesisSystem";
export type { FusionRecipe } from "./synthesisSystem";

// --- Territory ---
export {
	computeTerritory,
	getTerritoryPercent,
} from "./territorySystem";
export type { TileTerritory, TerritorySnapshot } from "./territorySystem";

// --- Toast Notifications ---
export {
	subscribeToasts,
	getVisibleToasts,
	pushToast,
	dismissToast,
	dismissAllToasts,
	muteCategory,
	unmuteCategory,
	isCategoryMuted,
	getMutedCategories,
	_resetToasts,
} from "./toastNotifications";
export type { ToastCategory, Toast } from "./toastNotifications";

// --- Turn Event Log ---
export {
	logTurnEvent,
	finalizeTurn,
	getCurrentTurnEvents,
	getCompletedTurnLogs,
	getCurrentTurnNumber,
	getTurnLog,
	rehydrateTurnEventLog,
	resetTurnEventLog,
} from "./turnEventLog";
export type { TurnEventType, TurnEvent, TurnLog } from "./turnEventLog";

// --- Turn Summary ---
export {
	collectTurnSummary,
	getTurnSummary,
	getRivalMilestones,
	subscribeTurnSummary,
	clearTurnSummary,
	resetTurnSummary,
} from "./turnSummary";
export type {
	ResourceChange,
	CombatResult,
	TurnSummaryData,
	RivalMilestone,
} from "./turnSummary";

// --- Turret ---
export { runTurrets } from "./turretSystem";

// --- Tutorial ---
export {
	subscribeTutorial,
	getTutorialState,
	getCurrentStep,
	completeCurrentStep,
	skipTutorial,
	isStepCompleted,
	getAllSteps,
	_resetTutorial,
} from "./tutorialSystem";
export type { TutorialStep, TutorialState } from "./tutorialSystem";

// --- Victory ---
export {
	checkVictoryConditions,
	getVictoryProgress,
	checkTechnicalSupremacy,
	_resetVictory,
	_getTechPoints,
} from "./victorySystem";
export type { VictoryReason, VictoryProgress } from "./victorySystem";

// --- Wormhole Project ---
export {
	canStartWormholeProject,
	isValidWormholePlacement,
	onWormholeStabilizerPlaced,
	tickWormholeProject,
	getWormholeProjectState,
	_resetWormholeProject,
} from "./wormholeProject";
export type { WormholeProjectState, WormholeTickResult } from "./wormholeProject";
